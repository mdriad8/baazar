/*
  # Backfill seller_id for orphaned product "shahi" and its order_lines

  The product "shahi" (id: 5048cf0f-5f7f-4bad-8543-f01c1a29f184) was created
  with seller_id = NULL due to a race condition where the seller_id state had
  not yet loaded when the insert fired. Based on co-occurrence in orders with
  other Demo Seller products, it belongs to seller 2c5fef3f-ef01-4a0d-b970-bcfafd4adb2c.

  Also backfills the 3 order_lines that had seller_id = NULL for this product.
*/

UPDATE products
SET seller_id = '2c5fef3f-ef01-4a0d-b970-bcfafd4adb2c'
WHERE id = '5048cf0f-5f7f-4bad-8543-f01c1a29f184'
  AND seller_id IS NULL;

UPDATE order_lines
SET seller_id = '2c5fef3f-ef01-4a0d-b970-bcfafd4adb2c'
WHERE product_id = '5048cf0f-5f7f-4bad-8543-f01c1a29f184'
  AND seller_id IS NULL;
