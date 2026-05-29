export const SITE_NAME = 'Baazar';
export const SITE_DESCRIPTION = 'South Asian Grocery & B2B Marketplace in Australia. Fresh halal meat, spices, rice, and more delivered to your door.';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://baazar.com.au';

export const ORDER_STATUSES = [
  { value: 'placed', label: 'Order Placed', color: 'blue' },
  { value: 'payment_authorised', label: 'Payment Authorised', color: 'blue' },
  { value: 'payment_confirmed', label: 'Payment Confirmed', color: 'green' },
  { value: 'stock_allocated', label: 'Stock Allocated', color: 'green' },
  { value: 'picking', label: 'Picking', color: 'yellow' },
  { value: 'packing', label: 'Packing', color: 'yellow' },
  { value: 'qc_ready', label: 'QC Ready', color: 'yellow' },
  { value: 'dispatch_ready', label: 'Dispatch Ready', color: 'orange' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'orange' },
  { value: 'nearby', label: 'Nearby', color: 'orange' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'failed_delivery', label: 'Failed Delivery', color: 'red' },
  { value: 'return_requested', label: 'Return Requested', color: 'red' },
  { value: 'refund_approved', label: 'Refund Approved', color: 'purple' },
  { value: 'refund_processed', label: 'Refund Processed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const;

export const PRODUCT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending_admin_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'published', label: 'Published' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'suspended', label: 'Suspended' },
] as const;

export const AD_PLACEMENTS = [
  { value: 'homepage_hero', label: 'Homepage Hero' },
  { value: 'homepage_featured', label: 'Homepage Featured' },
  { value: 'sponsored_search', label: 'Sponsored Search' },
  { value: 'category_page', label: 'Category Page' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'banner', label: 'Banner Ad' },
  { value: 'trending', label: 'Trending Section' },
] as const;

export const DELIVERY_FEE = 5.99;
export const FREE_DELIVERY_THRESHOLD = 80;
export const GST_RATE = 0.10;

export const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
] as const;

export const PAYMENT_GATEWAYS = [
  { value: 'stripe', label: 'Credit/Debit Card', icon: 'credit-card' },
  { value: 'paypal', label: 'PayPal', icon: 'paypal' },
  { value: 'afterpay', label: 'Afterpay', icon: 'afterpay' },
] as const;
