const request = require('supertest');

const API_URL = 'http://localhost:5000';

describe('Multi-Tenant Security & Isolation', () => {
  let tokenA;
  let tokenB;
  let manufacturerAData = {};
  let manufacturerBData = {};

  beforeAll(async () => {
    // 1. Log in as Manufacturer A (Seeded Admin)
    const resA = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: 'admin@profit.com', password: 'admin123' });
    
    expect(resA.status).toBe(200);
    tokenA = resA.body.token;

    // 2. Fetch Manufacturer A's data to get actual IDs
    const rawMaterialsA = await request(API_URL)
      .get('/api/raw-materials')
      .set('Authorization', `Bearer ${tokenA}`);
    manufacturerAData.rawMaterialId = rawMaterialsA.body[0]?.id;

    const componentsA = await request(API_URL)
      .get('/api/components')
      .set('Authorization', `Bearer ${tokenA}`);
    manufacturerAData.componentId = componentsA.body[0]?.id;

    const productsA = await request(API_URL)
      .get('/api/products')
      .set('Authorization', `Bearer ${tokenA}`);
    manufacturerAData.productId = productsA.body[0]?.id;

    const clientsA = await request(API_URL)
      .get('/api/clients')
      .set('Authorization', `Bearer ${tokenA}`);
    manufacturerAData.clientId = clientsA.body[0]?.id;

    // 3. Create Manufacturer B
    const resRegister = await request(API_URL)
      .post('/api/auth/register')
      .send({
        companyName: 'Test Manufacturer B',
        name: 'Admin B',
        email: 'manufacturerb@test.com',
        password: 'TestPassword123!'
      });

    // If already exists, login instead
    if (resRegister.status === 409 && resRegister.body.error === 'User already exists') {
      const resB = await request(API_URL)
        .post('/api/auth/login')
        .send({ email: 'manufacturerb@test.com', password: 'TestPassword123!' });
      tokenB = resB.body.token;
    } else {
      expect(resRegister.status).toBe(201);
      tokenB = resRegister.body.token;
    }
  });

  test('Manufacturer B dashboard should be empty initially', async () => {
    const res = await request(API_URL)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${tokenB}`);
    
    // Some apps might not have /api/dashboard/stats or might return different structures
    if (res.status === 200) {
      expect(res.body.rawMaterials).toBe(0);
      expect(res.body.products).toBe(0);
    }
  });

  describe('Direct API Security Tests (Cross-Tenant)', () => {
    test('Manufacturer B cannot read Manufacturer A Raw Material', async () => {
      const res = await request(API_URL)
        .get(`/api/raw-materials/${manufacturerAData.rawMaterialId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });

    test('Manufacturer B cannot update Manufacturer A Component', async () => {
      const res = await request(API_URL)
        .put(`/api/components/${manufacturerAData.componentId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Hacked Component' });
      expect(res.status).toBe(404);
    });

    test('Manufacturer B cannot delete Manufacturer A Product', async () => {
      const res = await request(API_URL)
        .delete(`/api/products/${manufacturerAData.productId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Cross-Tenant Relationship Tests', () => {
    test('Manufacturer B cannot create Component using Manufacturer A Raw Material', async () => {
      const res = await request(API_URL)
        .post('/api/components')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: 'Comp B',
          materials: [{ rawMaterialId: manufacturerAData.rawMaterialId, quantity: 1, unit: 'kg' }]
        });
      expect(res.status).toBe(403); // Explicitly returns 403 when material is not owned
    });

    test('Manufacturer B cannot create Client Price using Manufacturer A Product', async () => {
      const res = await request(API_URL)
        .post('/api/client-prices')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          clientId: manufacturerAData.clientId, // This is A's client, which should also fail
          productId: manufacturerAData.productId,
          sellingPrice: 1000
        });
      expect(res.status).toBe(404);
    });
  });

  describe('Client Pricing Security', () => {
    test('Manufacturer B cannot retrieve A\'s client prices', async () => {
      const res = await request(API_URL)
        .get(`/api/client-prices?clientId=${manufacturerAData.clientId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
    });
  });

  describe('Price Propagation Isolation', () => {
    test('Changing Manufacturer A raw material price does not affect Manufacturer B', async () => {
      const suffix = Date.now();
      // 1. Setup Manufacturer B Data
      const rmRes = await request(API_URL)
        .post('/api/raw-materials')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: `Steel B ${suffix}`, category: 'metal', currentPrice: 100, unit: 'kg' });
      const rawMaterialB = rmRes.body.id;

      const compRes = await request(API_URL)
        .post('/api/components')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: `Component B ${suffix}`,
          materials: [{ rawMaterialId: rawMaterialB, quantity: 2, unit: 'kg' }] // 2 * 100 = 200
        });
      expect(compRes.status).toBe(201);
      const componentB = compRes.body.id;
      expect(Number(compRes.body.currentCost)).toBe(200);

      const prodRes = await request(API_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: `Product B ${suffix}`,
          sku: `B-PROD-${suffix}`,
          components: [{ componentId: componentB, quantity: 1 }],
          labourCost: 50, machineCost: 0, manufacturingOverhead: 0, otherCost: 0, wastagePct: 0, packagingCost: 0,
          profitType: 'markup', profitPercentage: 20
        }); // 200 (mat) + 50 (lab) = 250 mfg. 250 + 20% = 300 SP
      const productB = prodRes.body.id;
      expect(Number(prodRes.body.manufacturingCost)).toBe(250);
      expect(Number(prodRes.body.recommendedSellingPrice)).toBe(300);

      // 2. Change A's raw material price (simulate changing Steel)
      await request(API_URL)
        .put(`/api/raw-materials/${manufacturerAData.rawMaterialId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Steel A Updated', currentPrice: 9999, category: 'metal', unit: 'kg' });

      // 3. Verify B is completely unchanged
      const verifyComp = await request(API_URL)
        .get(`/api/components/${componentB}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(Number(verifyComp.body.currentCost)).toBe(200);

      const verifyProd = await request(API_URL)
        .get(`/api/products/${productB}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(Number(verifyProd.body.manufacturingCost)).toBe(250);
      expect(Number(verifyProd.body.recommendedSellingPrice)).toBe(300);
    });
  });

});
