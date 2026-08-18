// Mock dashboard dataset (T-021) — feeds the Dashboard shell (T-020). Domain-realistic values for
// a wholesale building-materials distributor (Sales/Purchase Orders, Vendors, Pricing, branch
// Locations all point that direction) — the reviewed Stitch mockup's own placeholder content was
// unrelated (reused for layout only, ADR-177), so this invents matching-domain examples instead of
// copying it. All fake — no real backend/reporting endpoint exists yet.

export interface KpiCard {
  label: string;
  value: string;
  badge: { text: string; tone: 'default' | 'success' | 'warning' | 'error' };
}

export const KPI_CARDS: KpiCard[] = [
  { label: "Today's Sales", value: '$48,210', badge: { text: '+12.4%', tone: 'success' } },
  { label: 'Open Sales Orders', value: '37', badge: { text: '8 new today', tone: 'default' } },
  { label: 'PO Pending', value: '14', badge: { text: '3 Late', tone: 'warning' } },
  { label: 'Inventory Value', value: '$1,284,600', badge: { text: 'Updated 6:00 AM', tone: 'default' } },
  { label: 'Receivables', value: '$92,430', badge: { text: '$18,200 Overdue', tone: 'warning' } },
  { label: 'Low Stock Items', value: '9', badge: { text: 'Critical', tone: 'error' } },
];

export interface SalesTrendPoint {
  month: string;
  amount: number;
}

export const SALES_TREND: SalesTrendPoint[] = [
  { month: 'J', amount: 312000 },
  { month: 'F', amount: 298000 },
  { month: 'M', amount: 341000 },
  { month: 'A', amount: 356000 },
  { month: 'M', amount: 389000 },
  { month: 'J', amount: 412000 },
  { month: 'J', amount: 405000 },
  { month: 'A', amount: 431000 },
  { month: 'S', amount: 398000 },
  { month: 'O', amount: 422000 },
  { month: 'N', amount: 447000 },
  { month: 'D', amount: 468000 },
];

export const ORDER_STATUS = {
  total: 37,
  breakdown: [
    { status: 'Completed', percent: 54 },
    { status: 'Pending', percent: 27 },
    { status: 'Shipped', percent: 19 },
  ],
};

export interface PnlBar {
  label: string;
  value: string;
  percent: number;
}

export const PNL_OVERVIEW: PnlBar[] = [
  { label: 'Revenue', value: '$2,412,800', percent: 82 },
  { label: 'Purchases', value: '$1,538,200', percent: 61 },
  { label: 'Gross Margin', value: '$874,600', percent: 36 },
];

export interface RecentOrder {
  orderNumber: string;
  customer: string;
  status: 'Completed' | 'Pending' | 'Shipped';
  amount: string;
  shipDate: string;
}

export const RECENT_SALES_ORDERS: RecentOrder[] = [
  { orderNumber: 'SO-9401', customer: 'Riverside Builders LLC', status: 'Shipped', amount: '$8,240', shipDate: '2026-08-19' },
  { orderNumber: 'SO-9398', customer: 'Hallmark Roofing Co.', status: 'Pending', amount: '$3,120', shipDate: '2026-08-20' },
  { orderNumber: 'SO-9395', customer: 'Cedar Point Contractors', status: 'Completed', amount: '$14,860', shipDate: '2026-08-17' },
  { orderNumber: 'SO-9391', customer: 'Lonestar Framing Inc.', status: 'Shipped', amount: '$6,430', shipDate: '2026-08-19' },
  { orderNumber: 'SO-9388', customer: 'Bluebonnet Home Supply', status: 'Completed', amount: '$2,975', shipDate: '2026-08-16' },
];

export interface LowInventoryItem {
  product: string;
  qty: number;
  min: number;
}

export const LOW_INVENTORY: LowInventoryItem[] = [
  { product: '2x4 Douglas Fir Stud, 8ft', qty: 42, min: 200 },
  { product: '1/2in Drywall Sheet, 4x8', qty: 18, min: 100 },
  { product: 'Deck Screws 3in, 5lb Box', qty: 6, min: 50 },
  { product: '30lb Roofing Felt Roll', qty: 3, min: 25 },
];

export interface ActivityEntry {
  text: string;
  time: string;
}

export const CUSTOMER_ACTIVITY: ActivityEntry[] = [
  { text: 'Riverside Builders LLC created Quote #Q-2210', time: '18m ago' },
  { text: 'Order SO-9391 has been Shipped', time: '1h ago' },
  { text: 'Cedar Point Contractors paid Invoice #INV-5581', time: '3h ago' },
  { text: 'Hallmark Roofing Co. created Quote #Q-2207', time: '5h ago' },
  { text: 'Order SO-9388 has been Completed', time: '1d ago' },
];

export interface WarehouseSummary {
  name: string;
  code: string;
  sqft: number;
  capacityPercent: number;
  onHandQty: number;
  value: string;
}

export const WAREHOUSE_SUMMARY: WarehouseSummary[] = [
  { name: 'Main Branch - Houston', code: 'HOU', sqft: 48000, capacityPercent: 78, onHandQty: 22400, value: '$612,300' },
  { name: 'Dallas Warehouse', code: 'DAL', sqft: 36000, capacityPercent: 64, onHandQty: 15800, value: '$398,900' },
  { name: 'Austin Retail', code: 'AUS', sqft: 12000, capacityPercent: 55, onHandQty: 5200, value: '$273,400' },
];

export interface RankedItem {
  name: string;
  value: string;
  trend: 'up' | 'down';
}

export const TOP_SELLING_PRODUCTS: RankedItem[] = [
  { name: '2x4 Douglas Fir Stud, 8ft', value: '$84,200', trend: 'up' },
  { name: '1/2in Drywall Sheet, 4x8', value: '$61,900', trend: 'up' },
  { name: '3/4in CDX Plywood, 4x8', value: '$54,300', trend: 'down' },
  { name: 'Deck Screws 3in, 5lb Box', value: '$38,700', trend: 'up' },
];

export const TOP_CUSTOMERS: RankedItem[] = [
  { name: 'Riverside Builders LLC', value: '$412,600', trend: 'up' },
  { name: 'Cedar Point Contractors', value: '$367,200', trend: 'up' },
  { name: 'Lonestar Framing Inc.', value: '$298,400', trend: 'down' },
  { name: 'Hallmark Roofing Co.', value: '$251,900', trend: 'up' },
];

export interface TerritoryTotal {
  region: string;
  value: string;
}

export const SALES_TERRITORY: TerritoryTotal[] = [
  { region: 'Houston', value: '$1,140,200' },
  { region: 'Dallas', value: '$782,600' },
  { region: 'Austin', value: '$489,900' },
];
