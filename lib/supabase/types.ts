export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: { id: string; name: string; description: string | null; created_at: string };
        Insert: { id?: string; name: string; description?: string | null; created_at?: string };
        Update: { id?: string; name?: string; description?: string | null; created_at?: string };
      };
      user_roles: {
        Row: { id: string; user_id: string; role_id: string; assigned_by: string | null; created_at: string };
        Insert: { id?: string; user_id: string; role_id: string; assigned_by?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; role_id?: string; assigned_by?: string | null; created_at?: string };
      };
      customer_profiles: {
        Row: {
          id: string; user_id: string; first_name: string; last_name: string;
          phone: string; avatar_url: string; date_of_birth: string | null;
          gender: string; email_verified: boolean; phone_verified: boolean;
          total_orders: number; total_spending: number; loyalty_points: number;
          referral_code: string | null; referred_by: string | null;
          is_blocked: boolean; block_reason: string;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; first_name?: string; last_name?: string;
          phone?: string; avatar_url?: string; date_of_birth?: string | null;
          gender?: string; email_verified?: boolean; phone_verified?: boolean;
          total_orders?: number; total_spending?: number; loyalty_points?: number;
          referral_code?: string | null; referred_by?: string | null;
          is_blocked?: boolean; block_reason?: string;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customer_profiles']['Insert']>;
      };
      customer_addresses: {
        Row: {
          id: string; user_id: string; label: string; first_name: string; last_name: string;
          phone: string; address_line1: string; address_line2: string;
          suburb: string; state: string; postcode: string; country: string;
          latitude: number | null; longitude: number | null;
          is_default: boolean; delivery_notes: string;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; label?: string; first_name?: string; last_name?: string;
          phone?: string; address_line1?: string; address_line2?: string;
          suburb?: string; state?: string; postcode?: string; country?: string;
          latitude?: number | null; longitude?: number | null;
          is_default?: boolean; delivery_notes?: string;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customer_addresses']['Insert']>;
      };
      categories: {
        Row: {
          id: string; parent_id: string | null; name: string; slug: string;
          description: string; image_url: string; icon: string; sort_order: number;
          is_featured: boolean; is_active: boolean; seo_title: string; seo_description: string;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; parent_id?: string | null; name: string; slug: string;
          description?: string; image_url?: string; icon?: string; sort_order?: number;
          is_featured?: boolean; is_active?: boolean; seo_title?: string; seo_description?: string;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      brands: {
        Row: { id: string; name: string; slug: string; description: string; logo_url: string; country_of_origin: string; is_active: boolean; created_at: string };
        Insert: { id?: string; name: string; slug: string; description?: string; logo_url?: string; country_of_origin?: string; is_active?: boolean; created_at?: string };
        Update: Partial<Database['public']['Tables']['brands']['Insert']>;
      };
      products: {
        Row: {
          id: string; seller_id: string | null; category_id: string | null; brand_id: string | null;
          name: string; slug: string; description: string; short_description: string;
          sku: string; barcode: string; price: number; sale_price: number | null; cost_price: number | null;
          unit_type: string; weight_grams: number | null; is_variable_weight: boolean;
          stock_quantity: number; stock_status: string; low_stock_threshold: number;
          is_halal: boolean; halal_cert_number: string; storage_type: string;
          allergens: Json; country_of_origin: string; storage_instructions: string;
          expiry_days: number | null; ingredients: string; nutritional_info: Json;
          is_featured: boolean; is_trending: boolean; is_recommended: boolean;
          status: string; rejection_reason: string; admin_note: string;
          approved_by: string | null; approved_at: string | null;
          seo_title: string; seo_description: string;
          view_count: number; purchase_count: number; rating_average: number; rating_count: number;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; seller_id?: string | null; category_id?: string | null; brand_id?: string | null;
          name: string; slug: string; description?: string; short_description?: string;
          sku?: string; barcode?: string; price: number; sale_price?: number | null; cost_price?: number | null;
          unit_type?: string; weight_grams?: number | null; is_variable_weight?: boolean;
          stock_quantity?: number; stock_status?: string; low_stock_threshold?: number;
          is_halal?: boolean; halal_cert_number?: string; storage_type?: string;
          allergens?: Json; country_of_origin?: string; storage_instructions?: string;
          expiry_days?: number | null; ingredients?: string; nutritional_info?: Json;
          is_featured?: boolean; is_trending?: boolean; is_recommended?: boolean;
          status?: string; rejection_reason?: string; admin_note?: string;
          approved_by?: string | null; approved_at?: string | null;
          seo_title?: string; seo_description?: string;
          view_count?: number; purchase_count?: number; rating_average?: number; rating_count?: number;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      product_images: {
        Row: { id: string; product_id: string; image_url: string; alt_text: string; sort_order: number; is_primary: boolean; created_at: string };
        Insert: { id?: string; product_id: string; image_url: string; alt_text?: string; sort_order?: number; is_primary?: boolean; created_at?: string };
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>;
      };
      product_reviews: {
        Row: {
          id: string; product_id: string; user_id: string; order_id: string | null;
          rating: number; title: string; body: string; images: Json;
          is_verified_purchase: boolean; is_approved: boolean; helpful_count: number;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; product_id: string; user_id: string; order_id?: string | null;
          rating: number; title?: string; body?: string; images?: Json;
          is_verified_purchase?: boolean; is_approved?: boolean; helpful_count?: number;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_reviews']['Insert']>;
      };
      cart_items: {
        Row: { id: string; user_id: string; product_id: string; sku_id: string | null; quantity: number; unit_type: string; saved_for_later: boolean; added_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; product_id: string; sku_id?: string | null; quantity?: number; unit_type?: string; saved_for_later?: boolean; added_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['cart_items']['Insert']>;
      };
      wishlist_items: {
        Row: { id: string; user_id: string; product_id: string; added_at: string };
        Insert: { id?: string; user_id: string; product_id: string; added_at?: string };
        Update: Partial<Database['public']['Tables']['wishlist_items']['Insert']>;
      };
      orders: {
        Row: {
          id: string; order_number: string; user_id: string; address_id: string | null;
          delivery_address: Json; subtotal: number; discount_amount: number;
          delivery_fee: number; gst_amount: number; total_amount: number;
          promo_code: string; promo_code_id: string | null; order_note: string;
          delivery_slot_date: string | null; delivery_slot_time: string;
          status: string; payment_status: string; payment_method: string; payment_gateway: string;
          driver_id: string | null; driver_assigned_at: string | null;
          estimated_delivery_time: string | null; actual_delivery_time: string | null;
          proof_of_delivery_url: string; invoice_number: string; invoice_url: string;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; order_number: string; user_id: string; address_id?: string | null;
          delivery_address?: Json; subtotal: number; discount_amount?: number;
          delivery_fee?: number; gst_amount?: number; total_amount: number;
          promo_code?: string; promo_code_id?: string | null; order_note?: string;
          delivery_slot_date?: string | null; delivery_slot_time?: string;
          status?: string; payment_status?: string; payment_method?: string; payment_gateway?: string;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_lines: {
        Row: {
          id: string; order_id: string; product_id: string; sku_id: string | null;
          seller_id: string | null; product_name: string; product_sku: string;
          product_image_url: string; unit_price: number; quantity: number;
          unit_type: string; actual_weight: number | null; line_total: number;
          discount_amount: number; gst_rate: number; gst_amount: number;
          status: string; refund_amount: number; seller_payout_amount: number; created_at: string;
        };
        Insert: {
          id?: string; order_id: string; product_id: string; sku_id?: string | null;
          seller_id?: string | null; product_name: string; product_sku?: string;
          product_image_url?: string; unit_price: number; quantity: number;
          unit_type?: string; actual_weight?: number | null; line_total: number;
          discount_amount?: number; gst_rate?: number; gst_amount?: number;
          status?: string; refund_amount?: number; seller_payout_amount?: number; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_lines']['Insert']>;
      };
      order_tracking_events: {
        Row: {
          id: string; order_id: string; status: string; message: string;
          location_text: string; latitude: number | null; longitude: number | null;
          updated_by: string | null; is_customer_visible: boolean; created_at: string;
        };
        Insert: {
          id?: string; order_id: string; status: string; message?: string;
          location_text?: string; latitude?: number | null; longitude?: number | null;
          updated_by?: string | null; is_customer_visible?: boolean; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_tracking_events']['Insert']>;
      };
      seller_profiles: {
        Row: {
          id: string; application_id: string | null; slug: string; business_name: string;
          display_name: string; description: string; logo_url: string; banner_url: string;
          business_abn: string; business_type: string; contact_email: string;
          contact_phone: string; business_address: string; suburb: string; state: string;
          postcode: string; country: string; product_categories: Json;
          commission_rate: number; payment_terms: string;
          is_featured: boolean; status: string;
          rating_average: number; rating_count: number; total_products: number; total_sales: number;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; application_id?: string | null; slug: string; business_name: string;
          display_name: string; description?: string; logo_url?: string; banner_url?: string;
          business_abn?: string; business_type?: string; contact_email: string;
          contact_phone?: string; business_address?: string; suburb?: string; state?: string;
          postcode?: string; country?: string; product_categories?: Json;
          commission_rate?: number; payment_terms?: string;
          is_featured?: boolean; status?: string;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['seller_profiles']['Insert']>;
      };
      campaigns: {
        Row: {
          id: string; seller_id: string; product_id: string; name: string;
          ad_type: string; placement: string; start_date: string; end_date: string;
          number_of_days: number; daily_budget: number; total_budget: number;
          amount_paid: number; payment_status: string; payment_gateway: string;
          payment_id: string | null; bid_amount: number;
          status: string; admin_approval_status: string; admin_note: string;
          approved_by: string | null; approved_at: string | null;
          impressions: number; clicks: number; conversions: number; spend: number; roas: number;
          relevance_score: number; priority: number; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; seller_id: string; product_id: string; name: string;
          ad_type: string; placement: string; start_date: string; end_date: string;
          number_of_days: number; daily_budget: number; total_budget: number;
          amount_paid?: number; payment_status?: string; payment_gateway?: string;
          payment_id?: string | null; bid_amount?: number;
          status?: string; admin_approval_status?: string; admin_note?: string;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
      };
      payments: {
        Row: {
          id: string; payment_reference: string; user_id: string;
          order_id: string | null; campaign_id: string | null; seller_id: string | null;
          amount: number; currency: string; payment_gateway: string; payment_method: string;
          gateway_transaction_id: string; gateway_payment_intent_id: string; gateway_order_id: string;
          status: string; metadata: Json; failure_reason: string;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; payment_reference?: string; user_id: string;
          order_id?: string | null; campaign_id?: string | null; seller_id?: string | null;
          amount: number; currency?: string; payment_gateway: string; payment_method?: string;
          gateway_transaction_id?: string; gateway_payment_intent_id?: string; gateway_order_id?: string;
          status?: string; metadata?: Json; failure_reason?: string;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      promo_codes: {
        Row: {
          id: string; code: string; name: string; description: string; type: string;
          discount_value: number; max_discount_amount: number | null; minimum_order_amount: number;
          applicable_products: Json; applicable_categories: Json; applicable_sellers: Json;
          start_date: string; end_date: string | null;
          usage_limit: number | null; usage_per_customer: number; usage_count: number;
          new_customers_only: boolean; is_auto_apply: boolean; is_stackable: boolean;
          is_active: boolean; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; code: string; name: string; description?: string; type: string;
          discount_value: number; max_discount_amount?: number | null; minimum_order_amount?: number;
          applicable_products?: Json; applicable_categories?: Json; applicable_sellers?: Json;
          start_date?: string; end_date?: string | null;
          usage_limit?: number | null; usage_per_customer?: number; usage_count?: number;
          new_customers_only?: boolean; is_auto_apply?: boolean; is_stackable?: boolean;
          is_active?: boolean; created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['promo_codes']['Insert']>;
      };
      homepage_banners: {
        Row: {
          id: string; title: string; subtitle: string; image_url: string;
          mobile_image_url: string; link_url: string; link_text: string;
          position: string; sort_order: number; is_active: boolean;
          start_date: string | null; end_date: string | null;
          campaign_id: string | null; created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; title: string; subtitle?: string; image_url: string;
          mobile_image_url?: string; link_url?: string; link_text?: string;
          position?: string; sort_order?: number; is_active?: boolean;
          start_date?: string | null; end_date?: string | null;
          campaign_id?: string | null; created_by?: string | null; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['homepage_banners']['Insert']>;
      };
      support_tickets: {
        Row: {
          id: string; ticket_number: string; user_id: string; order_id: string | null;
          subject: string; description: string; category: string; priority: string;
          status: string; assigned_to: string | null; images: Json;
          resolution: string; resolved_at: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; ticket_number: string; user_id: string; order_id?: string | null;
          subject: string; description: string; category?: string; priority?: string;
          status?: string; assigned_to?: string | null; images?: Json;
          resolution?: string; resolved_at?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['support_tickets']['Insert']>;
      };
      notifications: {
        Row: {
          id: string; user_id: string; title: string; message: string; type: string;
          reference_type: string; reference_id: string | null; is_read: boolean;
          action_url: string; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; title: string; message: string; type?: string;
          reference_type?: string; reference_id?: string | null; is_read?: boolean;
          action_url?: string; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      refunds: {
        Row: {
          id: string; order_id: string; payment_id: string | null; user_id: string;
          amount: number; reason: string; note: string; type: string;
          status: string; gateway_refund_id: string;
          approved_by: string | null; approved_at: string | null; processed_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; order_id: string; payment_id?: string | null; user_id: string;
          amount: number; reason: string; note?: string; type?: string;
          status?: string; gateway_refund_id?: string;
          approved_by?: string | null; approved_at?: string | null; processed_at?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['refunds']['Insert']>;
      };
      wishlist_items: {
        Row: { id: string; user_id: string; product_id: string; added_at: string };
        Insert: { id?: string; user_id: string; product_id: string; added_at?: string };
        Update: Partial<Database['public']['Tables']['wishlist_items']['Insert']>;
      };
    };
  };
}
