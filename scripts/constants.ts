export const TOTAL_RECORDS = parseInt(process.env.TOTAL_RECORDS ?? '10000000', 10);
export const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? '5000', 10);

export const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Clothing',
  'Books',
  'Groceries',
  'Fitness',
  'Kitchen',
  'Automotive',
  'Accessories',
  'Sports',
] as const;

export const ADJECTIVES = [
  'Premium',
  'Ultra',
  'Pro',
  'Compact',
  'Wireless',
  'Portable',
  'Heavy Duty',
  'Slim',
  'Smart',
  'Advanced',
  'Ergonomic',
  'Deluxe',
  'Mini',
  'Turbo',
  'Classic',
  'Modern',
  'Budget',
  'Professional',
  'Lite',
  'Max',
];

export const NOUNS_BY_CATEGORY: Record<string, string[]> = {
  Electronics: [
    'Mouse', 'Keyboard', 'Monitor', 'Headphones', 'Speaker', 'Webcam',
    'USB Hub', 'Charger', 'Power Bank', 'Adapter', 'Microphone',
    'Laptop Stand', 'SSD Drive', 'Flash Drive', 'Smart Watch',
  ],
  Furniture: [
    'Chair', 'Desk', 'Shelf', 'Cabinet', 'Table', 'Stool',
    'Bookcase', 'Drawer Unit', 'Standing Desk', 'Monitor Arm',
    'Filing Cabinet', 'Coat Rack',
  ],
  Clothing: [
    'T-Shirt', 'Jacket', 'Hoodie', 'Jeans', 'Shorts', 'Socks',
    'Cap', 'Sneakers', 'Belt', 'Gloves', 'Scarf', 'Sweater',
  ],
  Books: [
    'Programming Guide', 'System Design Book', 'Data Structures Manual',
    'Clean Code Book', 'Design Patterns Guide', 'Algorithms Textbook',
    'Database Handbook', 'Networking Basics', 'Cloud Architecture Book',
    'DevOps Manual',
  ],
  Groceries: [
    'Coffee Beans', 'Green Tea', 'Protein Bar', 'Energy Drink',
    'Instant Oats', 'Vitamin Supplement', 'Snack Pack', 'Herbal Tea',
    'Dark Chocolate', 'Mineral Water',
  ],
  Fitness: [
    'Yoga Mat', 'Resistance Band', 'Dumbbells', 'Jump Rope',
    'Water Bottle', 'Gym Bag', 'Protein Shaker', 'Foam Roller',
    'Pull-Up Bar', 'Kettlebell',
  ],
  Kitchen: [
    'Coffee Mug', 'Water Filter', 'Cutting Board', 'Knife Set',
    'Blender', 'Toaster', 'Air Fryer', 'Lunch Box',
    'Food Processor', 'Electric Kettle',
  ],
  Automotive: [
    'Car Charger', 'Dash Cam', 'Car Mat', 'Air Freshener',
    'Phone Mount', 'Jump Starter', 'Tire Gauge',
    'Steering Wheel Cover', 'Car Vacuum',
  ],
  Accessories: [
    'Phone Case', 'Screen Protector', 'Laptop Bag', 'Backpack',
    'Wallet', 'Sunglasses', 'Watch', 'Earbuds Case',
    'Cable Organizer', 'Travel Adapter',
  ],
  Sports: [
    'Football', 'Basketball', 'Tennis Racket', 'Badminton Set',
    'Cricket Bat', 'Swimming Goggles', 'Running Shoes', 'Cycling Helmet',
    'Skipping Rope', 'Sports Gloves',
  ],
};
