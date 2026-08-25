const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const CostCalculationService = require('../src/lib/CostCalculationService');

async function main() {
  console.log('Seeding Dynamic Manufacturing Cost & Pricing Manager database...');

  // Clean existing tables in correct order
  await prisma.auditLog.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.costChangeHistory.deleteMany({});
  await prisma.clientPriceHistory.deleteMany({});
  await prisma.clientProductPrice.deleteMany({});
  await prisma.packagingConfig.deleteMany({});
  await prisma.productComponent.deleteMany({});
  await prisma.componentMaterial.deleteMany({});
  await prisma.rawMaterialPriceHistory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.component.deleteMany({});
  await prisma.rawMaterial.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.whatIfScenario.deleteMany({});
  await prisma.systemSetting.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.manufacturer.deleteMany({});

  // 0. Manufacturer
  const manufacturer = await prisma.manufacturer.create({
    data: {
      name: 'Apex Dynamic Manufacturing Ltd.',
      email: 'contact@apexindustries.in',
      phone: '+91 98765 43210',
      address: 'Industrial Area, Phase 1'
    }
  });

  console.log('Manufacturer created:', manufacturer.name);

  // 1. Users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@profit.com',
      password: hashedPassword,
      name: 'Operations Director (Admin)',
      role: 'manufacturer_admin',
      manufacturerId: manufacturer.id
    }
  });

  const userPassword = await bcrypt.hash('user123', 10);
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@profit.com',
      password: userPassword,
      name: 'Cost Estimator (User)',
      role: 'manufacturer',
      manufacturerId: manufacturer.id
    }
  });

  console.log('Users created: admin@profit.com / admin123, user@profit.com / user123');

  // 2. System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'currency_symbol', value: '₹', description: 'Default currency symbol' },
      { key: 'currency_code', value: 'INR', description: 'Default currency ISO code' },
      { key: 'company_name', value: 'Apex Dynamic Manufacturing Ltd.', description: 'Organization name' },
      { key: 'decimal_precision', value: '2', description: 'UI display decimal precision' }
    ]
  });

  // 3. Raw Materials
  const rawMaterialData = [
    { name: 'Steel Sheet (CRCA)', category: 'Metal', unit: 'kg', currentPrice: 100.0, previousPrice: 95.0, description: 'Cold Rolled Close Annealed Steel Sheet (2mm)' },
    { name: 'Aluminium Alloy 6061', category: 'Metal', unit: 'kg', currentPrice: 250.0, previousPrice: 240.0, description: 'Extruded high-strength aluminium bar' },
    { name: 'Copper Wire 99.9%', category: 'Metal', unit: 'kg', currentPrice: 650.0, previousPrice: 620.0, description: 'Electrolytic grade copper conductor' },
    { name: 'High-Density Polyethylene', category: 'Plastic', unit: 'kg', currentPrice: 180.0, previousPrice: 175.0, description: 'Virgin injection molding grade HDPE' },
    { name: 'Industrial Vulcanized Rubber', category: 'Rubber', unit: 'kg', currentPrice: 140.0, previousPrice: 135.0, description: 'Durable wear-resistant base rubber' },
    { name: 'Polyurethane Industrial Paint', category: 'Chemical', unit: 'litre', currentPrice: 300.0, previousPrice: 285.0, description: 'Anti-corrosive powder coating paint' },
    { name: 'Welding Electrode Rod E6013', category: 'Metal', unit: 'kg', currentPrice: 200.0, previousPrice: 190.0, description: 'Mild steel welding filler rod' },
    { name: 'Toughened Tempered Glass (8mm)', category: 'Glass', unit: 'piece', currentPrice: 450.0, previousPrice: 420.0, description: 'High impact safety glass pane' },
    { name: 'Stainless Steel Grade 304', category: 'Metal', unit: 'kg', currentPrice: 320.0, previousPrice: 310.0, description: 'Food & marine grade corrosion resistant steel' },
    { name: '3-Ply Corrugated Packing Sheet', category: 'Packaging', unit: 'kg', currentPrice: 45.0, previousPrice: 42.0, description: 'Recyclable packaging flute board' }
  ];

  const rawMaterials = {};
  for (const item of rawMaterialData) {
    const change = item.currentPrice - (item.previousPrice || item.currentPrice);
    const changePct = item.previousPrice ? (change / item.previousPrice) * 100 : 0;
    const rm = await prisma.rawMaterial.create({
      data: {
        manufacturerId: manufacturer.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentPrice: item.currentPrice,
        previousPrice: item.previousPrice,
        priceChange: change,
        priceChangePct: changePct,
        description: item.description
      }
    });
    rawMaterials[item.name] = rm;

    const d1 = new Date(); d1.setDate(d1.getDate() - 60);
    const d3 = new Date(); d3.setDate(d3.getDate() - 5);

    await prisma.rawMaterialPriceHistory.createMany({
      data: [
        {
          rawMaterialId: rm.id,
          manufacturerId: manufacturer.id,
          previousPrice: (item.previousPrice || item.currentPrice) * 0.92,
          newPrice: item.previousPrice || item.currentPrice,
          difference: (item.previousPrice || item.currentPrice) * 0.08,
          changePct: 8.7,
          changedAt: d1
        },
        {
          rawMaterialId: rm.id,
          manufacturerId: manufacturer.id,
          previousPrice: item.previousPrice || item.currentPrice,
          newPrice: item.currentPrice,
          difference: change,
          changePct: changePct,
          changedAt: d3
        }
      ]
    });
  }

  console.log('10 Raw materials and price histories seeded.');

  // 4. Components
  const metalFrame = await prisma.component.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Metal Frame Assembly',
      description: 'Precision welded tubular steel frame structure',
      additionalCost: 0,
      currentCost: 200,
      previousCost: 190
    }
  });
  await prisma.componentMaterial.createMany({
    data: [
      { componentId: metalFrame.id, rawMaterialId: rawMaterials['Steel Sheet (CRCA)'].id, quantity: 2.0, unit: 'kg', cost: 200.0 }
    ]
  });

  const seatComponent = await prisma.component.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Ergonomic Contoured Seat',
      description: 'Molded high-density polymeric seat base with rubber cushioning',
      additionalCost: 20.0,
      currentCost: 234.0, 
      previousCost: 225.0
    }
  });
  await prisma.componentMaterial.createMany({
    data: [
      { componentId: seatComponent.id, rawMaterialId: rawMaterials['High-Density Polyethylene'].id, quantity: 0.8, unit: 'kg', cost: 144.0 },
      { componentId: seatComponent.id, rawMaterialId: rawMaterials['Industrial Vulcanized Rubber'].id, quantity: 0.5, unit: 'kg', cost: 70.0 }
    ]
  });

  const backrestComponent = await prisma.component.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Reinforced Lumbar Backrest',
      description: 'High support spinal backrest with anti-corrosion coating',
      additionalCost: 15.0,
      currentCost: 217.0, 
      previousCost: 210.0
    }
  });
  await prisma.componentMaterial.createMany({
    data: [
      { componentId: backrestComponent.id, rawMaterialId: rawMaterials['Steel Sheet (CRCA)'].id, quantity: 1.0, unit: 'kg', cost: 100.0 },
      { componentId: backrestComponent.id, rawMaterialId: rawMaterials['Polyurethane Industrial Paint'].id, quantity: 100.0, unit: 'ml', cost: 30.0 },
      { componentId: backrestComponent.id, rawMaterialId: rawMaterials['High-Density Polyethylene'].id, quantity: 0.4, unit: 'kg', cost: 72.0 }
    ]
  });

  const wheelComponent = await prisma.component.create({
    data: {
      manufacturerId: manufacturer.id,
      name: '360° Industrial Wheel Assembly',
      description: 'Quad ball-bearing caster wheels with stainless steel housing',
      additionalCost: 10.0,
      currentCost: 180.0, 
      previousCost: 175.0
    }
  });
  await prisma.componentMaterial.createMany({
    data: [
      { componentId: wheelComponent.id, rawMaterialId: rawMaterials['Stainless Steel Grade 304'].id, quantity: 0.4, unit: 'kg', cost: 128.0 },
      { componentId: wheelComponent.id, rawMaterialId: rawMaterials['Industrial Vulcanized Rubber'].id, quantity: 0.3, unit: 'kg', cost: 42.0 }
    ]
  });

  const bodyComponent = await prisma.component.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Modular Aluminium Chassis Frame',
      description: 'Lightweight high tensile architectural frame body',
      additionalCost: 50.0,
      currentCost: 1055.0,
      previousCost: 1020.0
    }
  });
  await prisma.componentMaterial.createMany({
    data: [
      { componentId: bodyComponent.id, rawMaterialId: rawMaterials['Aluminium Alloy 6061'].id, quantity: 2.5, unit: 'kg', cost: 625.0 },
      { componentId: bodyComponent.id, rawMaterialId: rawMaterials['Stainless Steel Grade 304'].id, quantity: 1.0, unit: 'kg', cost: 320.0 },
      { componentId: bodyComponent.id, rawMaterialId: rawMaterials['Polyurethane Industrial Paint'].id, quantity: 200.0, unit: 'ml', cost: 60.0 }
    ]
  });

  console.log('5 Components and BOMs seeded.');

  // 5. Products
  const productA = await prisma.product.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Product A (Heavy Industrial Frame)',
      sku: 'PRD-IND-001',
      category: 'Industrial Furnishing',
      description: 'Heavy duty standard manufacturing unit for industrial operations',
      weight: 4.5,
      size: '120x60x85 cm',
      materialCost: 200.0,
      labourCost: 400.0,
      machineCost: 200.0,
      manufacturingOverhead: 150.0,
      otherCost: 50.0,
      packagingCost: 0.0,
      transportationCost: 0.0,
      wastagePct: 0.0,
      wastageCost: 0.0,
      manufacturingCost: 1000.0,
      profitType: 'markup',
      profitPercentage: 20.0,
      recommendedSellingPrice: 1200.0,
      givenSellingPrice: 1200.0,
      previousManufacturingCost: 980.0,
      lastRecalculatedAt: new Date()
    }
  });
  await prisma.productComponent.create({
    data: { productId: productA.id, componentId: metalFrame.id, quantity: 1.0, cost: 200.0 }
  });

  const productChair = await prisma.product.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Executive Ergonomic Industrial Chair',
      sku: 'PRD-CHR-002',
      category: 'Seating & Ergonomics',
      description: 'Adjustable pneumatic lumbar supported high-resilience workstation chair',
      weight: 12.0,
      size: '65x65x110 cm',
      materialCost: 831.0,
      labourCost: 120.0,
      machineCost: 40.0,
      manufacturingOverhead: 60.0,
      otherCost: 0.0,
      packagingCost: 25.0,
      transportationCost: 20.0,
      wastagePct: 5.0,
      wastageCost: 41.55,
      manufacturingCost: 1137.55,
      profitType: 'markup',
      profitPercentage: 25.0,
      recommendedSellingPrice: 1421.94,
      givenSellingPrice: 1450.0,
      previousManufacturingCost: 1100.0,
      lastRecalculatedAt: new Date()
    }
  });
  await prisma.productComponent.createMany({
    data: [
      { productId: productChair.id, componentId: metalFrame.id, quantity: 1.0, cost: 200.0 },
      { productId: productChair.id, componentId: seatComponent.id, quantity: 1.0, cost: 234.0 },
      { productId: productChair.id, componentId: backrestComponent.id, quantity: 1.0, cost: 217.0 },
      { productId: productChair.id, componentId: wheelComponent.id, quantity: 1.0, cost: 180.0 }
    ]
  });

  const outerCarton = await prisma.packagingConfig.create({
    data: {
      productId: productChair.id,
      name: 'Master Corrugated Shipping Crate',
      level: 0,
      unitCost: 120.0,
      unitsPerParent: 1,
      productsPerUnit: 8 
    }
  });
  await prisma.packagingConfig.create({
    data: {
      productId: productChair.id,
      parentId: outerCarton.id,
      name: 'Foam & Bubble Wrap Cushioning',
      level: 1,
      unitCost: 10.0,
      unitsPerParent: 1,
      productsPerUnit: 1
    }
  });

  const productTable = await prisma.product.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Modular Aluminium Workstation Table',
      sku: 'PRD-TBL-003',
      category: 'Workstations',
      description: 'Heavy duty aluminium and steel modular assembly table with ESD protection',
      weight: 28.0,
      size: '180x90x75 cm',
      materialCost: 1455.0,
      labourCost: 200.0,
      machineCost: 80.0,
      manufacturingOverhead: 100.0,
      otherCost: 0.0,
      packagingCost: 40.0,
      transportationCost: 50.0,
      wastagePct: 3.0,
      wastageCost: 43.65,
      manufacturingCost: 1968.65,
      profitType: 'margin',
      profitPercentage: 30.0,
      recommendedSellingPrice: 2812.36,
      givenSellingPrice: 2850.0,
      previousManufacturingCost: 1900.0,
      lastRecalculatedAt: new Date()
    }
  });
  await prisma.productComponent.createMany({
    data: [
      { productId: productTable.id, componentId: bodyComponent.id, quantity: 1.0, cost: 1055.0 },
      { productId: productTable.id, componentId: metalFrame.id, quantity: 2.0, cost: 400.0 }
    ]
  });

  console.log('3 Products seeded with multi-level BOMs and packaging.');

  // 6. Clients
  const clientA = await prisma.client.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Apex Industrial Solutions Ltd.',
      code: 'CLI-APEX-001',
      contact: 'Rajesh Sharma (Procurement Head)',
      email: 'procurement@apexindustries.in',
      phone: '+91 98200 12345',
      address: 'Plot 42, MIDC Industrial Area, Pune, Maharashtra',
      notes: 'Key enterprise account. Net 30 payment terms.'
    }
  });

  const clientB = await prisma.client.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Bharat Manufacturing Enterprises',
      code: 'CLI-BME-002',
      contact: 'Sunil Verma (Operations Manager)',
      email: 'sverma@bharatmfg.com',
      phone: '+91 98110 56789',
      address: 'Phase IV, Peenya Industrial Estate, Bengaluru, Karnataka',
      notes: 'High volume quarterly orders with regular container shipments.'
    }
  });

  const clientC = await prisma.client.create({
    data: {
      manufacturerId: manufacturer.id,
      name: 'Crestline Global Infrastructure',
      code: 'CLI-CGI-003',
      contact: 'Priya Sundaram (Supply Chain VP)',
      email: 'priya.s@crestlineglobal.com',
      phone: '+91 98450 98765',
      address: 'Tower B, OMR Tech Park, Chennai, Tamil Nadu',
      notes: 'Premium commercial projects client, high margin tolerance.'
    }
  });

  console.log('3 Clients seeded.');

  // 7. Client Specific Pricing
  const clientPricesData = [
    { client: clientA, product: productA, price: 1100.0, cost: 1000.0 },
    { client: clientB, product: productA, price: 1200.0, cost: 1000.0 },
    { client: clientC, product: productA, price: 1300.0, cost: 1000.0 },
    { client: clientA, product: productChair, price: 1450.0, cost: 1137.55 },
    { client: clientB, product: productChair, price: 1520.0, cost: 1137.55 },
    { client: clientC, product: productChair, price: 1650.0, cost: 1137.55 },
    { client: clientA, product: productTable, price: 2800.0, cost: 1968.65 },
    { client: clientB, product: productTable, price: 2950.0, cost: 1968.65 },
    { client: clientC, product: productTable, price: 3100.0, cost: 1968.65 }
  ];

  for (const cp of clientPricesData) {
    const profit = cp.price - cp.cost;
    const markup = cp.cost > 0 ? (profit / cp.cost) * 100 : 0;
    const margin = cp.price > 0 ? (profit / cp.price) * 100 : 0;

    await prisma.clientProductPrice.create({
      data: {
        manufacturerId: manufacturer.id,
        clientId: cp.client.id,
        productId: cp.product.id,
        sellingPrice: cp.price,
        profit: profit,
        markup: markup,
        profitMargin: margin
      }
    });
  }

  console.log('Client-specific pricing matrix created.');

  // 8. Historical Sales Transactions
  const saleDates = [
    new Date(2026, 0, 15),
    new Date(2026, 0, 28),
    new Date(2026, 1, 10),
    new Date(2026, 1, 24),
    new Date(2026, 2, 5),
    new Date(2026, 2, 18)
  ];

  const salesRecords = [
    { date: saleDates[0], client: clientA, product: productA, qty: 50, unitSelling: 1100, costAtSale: 1000 },
    { date: saleDates[1], client: clientB, product: productChair, qty: 30, unitSelling: 1520, costAtSale: 1137.55 },
    { date: saleDates[2], client: clientC, product: productTable, qty: 15, unitSelling: 3100, costAtSale: 1968.65 },
    { date: saleDates[3], client: clientA, product: productChair, qty: 45, unitSelling: 1450, costAtSale: 1137.55 },
    { date: saleDates[4], client: clientB, product: productA, qty: 60, unitSelling: 1200, costAtSale: 1000 },
    { date: saleDates[5], client: clientC, product: productA, qty: 25, unitSelling: 1300, costAtSale: 1000 }
  ];

  for (const s of salesRecords) {
    const revenue = s.qty * s.unitSelling;
    const totalCost = s.qty * s.costAtSale;
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    await prisma.sale.create({
      data: {
        manufacturerId: manufacturer.id,
        date: s.date,
        clientId: s.client.id,
        productId: s.product.id,
        quantity: s.qty,
        sellingPrice: s.unitSelling,
        costAtSale: s.costAtSale, 
        revenue: revenue,
        totalCost: totalCost,
        profit: profit,
        profitMargin: profitMargin,
        notes: `Production Batch Invoice #${Math.floor(100000 + Math.random() * 900000)}`,
        userId: adminUser.id
      }
    });
  }

  console.log('Historical sales with locked unit cost seeded.');

  // 9. Initial Cost Change History
  await prisma.costChangeHistory.create({
    data: {
      manufacturerId: manufacturer.id,
      productId: productChair.id,
      previousCost: 1100.0,
      newCost: 1137.55,
      difference: 37.55,
      differencePct: 3.41,
      previousRecommendedPrice: 1375.0,
      newRecommendedPrice: 1421.94,
      reason: 'Raw material polyurethane paint and steel sheet price adjustment',
      triggerMaterialId: rawMaterials['Steel Sheet (CRCA)'].id,
      changedAt: new Date(2026, 1, 15)
    }
  });

  // 10. Audit Log
  await prisma.auditLog.create({
    data: {
      manufacturerId: manufacturer.id,
      userId: adminUser.id,
      action: 'SYSTEM_INITIALIZATION',
      entity: 'System',
      entityId: 1,
      details: 'Full Dynamic Manufacturing ERP database seeded with baseline BOM costing and client matrices.'
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
