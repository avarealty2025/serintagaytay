-- 0007_seed.sql
-- Seed buildings and units from the owner's spreadsheet.
-- This runs once after the schema is applied.

-- ---------------------------------------------------------------------------
-- Buildings
-- ---------------------------------------------------------------------------

INSERT INTO buildings (id, name, address) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Serin West', 'Serin West, Tagaytay City, Cavite'),
  ('b0000000-0000-0000-0000-000000000002', 'Serin East', 'Serin East, Tagaytay City, Cavite')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Units
-- ---------------------------------------------------------------------------
-- slug column not needed; the app ID is reconstructed as:
--   lower(building.name without 'Serin ') || '-' || tower || '-' || code
-- e.g. 'west-2-919'

INSERT INTO units (building_id, tower, code, name, type, size_sqm, capacity, max_guests, base_rate, weekend_rate, cleaning_fee, extra_guest_fee, min_stay, active, description, amenities) VALUES
  -- Serin West
  ('b0000000-0000-0000-0000-000000000001', 1, '121', NULL, '1br', 56.61, 2, 6, 3000, 3500, 0, 0, 1, true,
   'Separate bedroom with queen or king bed, full living area, dining space, and equipped kitchen. Great for families or groups wanting privacy.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Induction Cooker','Cooking Utensils','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Iron & Board','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 2, '201', NULL, '2br', 75, 2, 8, 5000, 5500, 0, 0, 1, true,
   'Two-bedroom suite with separate master and guest bedrooms, full living and dining area, and equipped kitchen. Perfect for families or group getaways.',
   ARRAY['Wi-Fi','Air Conditioning (all rooms)','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Induction Cooker','Cooking Utensils & Dining Set','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Iron & Board','Balcony','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 1, '210', 'SINAG', 'studio', 22.58, 2, 4, 1800, 2200, 0, 0, 1, true,
   'Cozy studio unit perfect for solo travelers or couples. Open layout with sleeping and living area combined, kitchenette, and full bathroom.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Electric Kettle','Towels & Bed Linens','Hot & Cold Shower','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 2, '221', NULL, '2br', NULL, 2, 8, 5000, 5500, 0, 0, 1, true,
   'Two-bedroom suite with separate master and guest bedrooms, full living and dining area, and equipped kitchen. Perfect for families or group getaways.',
   ARRAY['Wi-Fi','Air Conditioning (all rooms)','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Induction Cooker','Cooking Utensils & Dining Set','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Iron & Board','Balcony','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 2, '420', 'AMIHAN', '1br', 50.75, 2, 6, 3000, 3500, 0, 0, 1, true,
   'Separate bedroom with queen or king bed, full living area, dining space, and equipped kitchen. Great for families or groups wanting privacy.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Induction Cooker','Cooking Utensils','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Iron & Board','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 1, '511', 'PAYAPA', '1br', 41.02, 2, 6, 3000, 3500, 0, 0, 1, true,
   'Separate bedroom with queen or king bed, full living area, dining space, and equipped kitchen. Great for families or groups wanting privacy.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Induction Cooker','Cooking Utensils','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Iron & Board','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 1, '517', NULL, 'exec_studio', 30.51, 2, 4, 2000, 2500, 0, 0, 1, true,
   'Spacious executive studio with a premium layout, wider floor area, and upgraded finishes. Ideal for couples or small groups wanting extra comfort.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 1, '605', 'DAPITHAPON', 'exec_studio', 32, 2, 4, 2000, 2500, 0, 0, 1, true,
   'Spacious executive studio with a premium layout, wider floor area, and upgraded finishes. Ideal for couples or small groups wanting extra comfort.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 1, '906', NULL, 'exec_studio', 32, 2, 4, 2000, 2500, 0, 0, 1, true,
   'Spacious executive studio with a premium layout, wider floor area, and upgraded finishes. Ideal for couples or small groups wanting extra comfort.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 2, '919', 'TANAW', '2br', 80, 2, 8, 5000, 5500, 0, 0, 1, true,
   'Two-bedroom suite with separate master and guest bedrooms, full living and dining area, and equipped kitchen. Perfect for families or group getaways.',
   ARRAY['Wi-Fi','Air Conditioning (all rooms)','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Induction Cooker','Cooking Utensils & Dining Set','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Iron & Board','Balcony','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000001', 2, '1407', 'DUNGAW', '1br', 41.02, 2, 6, 3000, 3500, 0, 0, 1, true,
   'Separate bedroom with queen or king bed, full living area, dining space, and equipped kitchen. Great for families or groups wanting privacy.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Induction Cooker','Cooking Utensils','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Iron & Board','Swimming Pool Access']),

  -- Serin East
  ('b0000000-0000-0000-0000-000000000002', 2, '114', NULL, 'exec_studio', 32.8, 2, 4, 2000, 2500, 0, 0, 1, true,
   'Spacious executive studio with a premium layout, wider floor area, and upgraded finishes. Ideal for couples or small groups wanting extra comfort.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000002', 1, '220', NULL, 'exec_studio', 30.45, 2, 4, 2000, 2500, 0, 0, 1, true,
   'Spacious executive studio with a premium layout, wider floor area, and upgraded finishes. Ideal for couples or small groups wanting extra comfort.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000002', 2, '407', NULL, 'studio', 22.7, 2, 4, 1800, 2200, 0, 0, 1, true,
   'Cozy studio unit perfect for solo travelers or couples. Open layout with sleeping and living area combined, kitchenette, and full bathroom.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Electric Kettle','Towels & Bed Linens','Hot & Cold Shower','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000002', 1, '414', NULL, 'studio', 22.4, 2, 4, 1800, 2200, 0, 0, 1, true,
   'Cozy studio unit perfect for solo travelers or couples. Open layout with sleeping and living area combined, kitchenette, and full bathroom.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Electric Kettle','Towels & Bed Linens','Hot & Cold Shower','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000002', 1, '517', NULL, 'studio', 23.2, 2, 4, 1800, 2200, 0, 0, 1, true,
   'Cozy studio unit perfect for solo travelers or couples. Open layout with sleeping and living area combined, kitchenette, and full bathroom.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Electric Kettle','Towels & Bed Linens','Hot & Cold Shower','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000002', 2, '726', 'KANLUNGAN', '1br', 54.5, 2, 6, 3000, 3500, 0, 0, 1, true,
   'Separate bedroom with queen or king bed, full living area, dining space, and equipped kitchen. Great for families or groups wanting privacy.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Induction Cooker','Cooking Utensils','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Iron & Board','Swimming Pool Access']),

  ('b0000000-0000-0000-0000-000000000002', 1, '809', NULL, 'exec_studio', NULL, 2, 4, 2000, 2500, 0, 0, 1, false,
   'Spacious executive studio with a premium layout, wider floor area, and upgraded finishes. Ideal for couples or small groups wanting extra comfort.',
   ARRAY['Wi-Fi','Air Conditioning','Smart TV with Netflix','Refrigerator','Microwave','Electric Kettle','Rice Cooker','Towels & Bed Linens','Hot & Cold Shower','Hair Dryer','Swimming Pool Access']);

-- ---------------------------------------------------------------------------
-- Default settings
-- ---------------------------------------------------------------------------

INSERT INTO settings (key, value, description) VALUES
  ('business', '{"name":"Serin Tagaytay Staycation","address":"Serin West & East, Tagaytay City, Cavite","phone":"","email":"","website":"serintagaytaystaycation.com","tin":""}', 'Business info'),
  ('booking', '{"checkInTime":"14:00","checkOutTime":"12:00","holdDurationHours":12,"holdReminderHours":6,"minStayDefault":1,"maxStayDefault":28,"reservationFee":0,"reservationFeeType":"fixed"}', 'Booking rules'),
  ('payment', '{"methods":["GCash","Bank Transfer"],"gcashName":"","gcashNumber":"","bankName":"","bankAccountName":"","bankAccountNumber":"","instructions":"Please send your payment within the hold period. Include your booking reference in the payment note."}', 'Payment channels'),
  ('fees', '{"cleaningFee":0,"extraGuestFee":0,"securityDeposit":0,"earlyCheckInFee":0,"lateCheckOutFee":0}', 'Default fees'),
  ('houseRules', '["No smoking inside the unit","No pets allowed","No parties or events","Quiet hours: 10 PM to 7 AM","Maximum guests as per unit capacity","Valid government ID required at check-in"]', 'House rules')
ON CONFLICT (key) DO NOTHING;
