# Dynamic Manufacturing Cost & Pricing Manager

A full-stack, enterprise-grade manufacturing costing and pricing management system. This application helps manufacturing businesses manage raw materials, components, and finished products, automatically recalculating costs and suggested selling prices across the entire product catalog whenever a raw material price changes.

## Features

- **Raw Material Management**: Track current and historical prices of raw materials.
- **Component & Product BOM (Bill of Materials)**: Create dynamic hierarchies where products are built from components, and components from raw materials.
- **Automatic Price Propagation**: When a raw material's price changes, all affected components and products are instantly recalculated.
- **Cost Transparency**: Highly detailed breakdown of manufacturing costs including material cost, labour, machine, overhead, packaging, and wastage.
- **Dynamic Pricing Engine**: Flexible pricing using Markup or Profit Margin strategies.
- **Packaging Hierarchy**: Multi-level packaging calculations (e.g., Cartons -> Inner Boxes -> Product).
- **Client Management & Pricing**: Manage custom selling prices for different clients and track profitability per client.
- **Historical Accuracy**: Sales records and price histories are locked to the cost present at the time of the transaction.
- **What-If Simulator**: A powerful engine to simulate changes in material prices, labour, or wastage to preview the impact on profit margins before saving to the database.
- **Comprehensive Dashboard**: Real-time KPI cards, price impact analysis, charts, and reports.

## Tech Stack

**Frontend:**
- React.js (Vite)
- Tailwind CSS
- Recharts (for analytics and history visualization)

**Backend:**
- Node.js & Express.js
- Prisma (ORM)
- PostgreSQL
- JWT Authentication

---

## Project Structure

- `/client` - Contains the React Vite application.
- `/server` - Contains the Node.js Express server and Prisma ORM configuration.

## Getting Started

### Prerequisites
- Node.js (v16+)
- PostgreSQL (or SQLite configured by default for dev)

### 1. Backend Setup (`/server`)

Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
```

Set up your database using Prisma:
```bash
# Apply database migrations
npx prisma db push

# (Optional) Seed the database with sample manufacturing data
npx prisma db seed
```

Start the backend development server:
```bash
npm run dev
```
*The server will start on port 5000.*

### 2. Frontend Setup (`/client`)

Open a new terminal, navigate to the `client` directory and install dependencies:
```bash
cd client
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*The React app will usually start on port 5173.*

## Usage Workflow Example

1. **Create Raw Materials**: Go to the Raw Materials tab and add materials like Steel (₹120/kg).
2. **Create Components**: Go to Components and create a "Metal Frame" that uses 2kg of Steel.
3. **Create Products**: Go to Products and create an "Industrial Chair" that uses 1 "Metal Frame" + Labour costs.
4. **Witness Price Propagation**: Change the price of Steel to ₹150/kg. Watch as the "Metal Frame" and "Industrial Chair" costs are instantly updated and logged in the Price Impact History.
5. **Simulate Scenarios**: Head over to the What-If Simulator to preview how tweaking wastage % or transportation costs affects your bottom line.

## License
MIT License
