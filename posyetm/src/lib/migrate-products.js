// Migration script to populate Firebase with dummy products
// Run this once to populate the database

import { addNestedDocument, getNestedCollection } from './firebase-helpers';
import { buildProductsPath } from './firebase-config';

// All dummy products from sales page
const dummyProducts = [
  // Beverages
  { name: 'Coca Cola', price: 25, stock: 50, sku: 'COKE001', barcode: '1234567890', category: 'Beverages' },
  { name: 'Pepsi', price: 25, stock: 45, sku: 'PEPSI001', barcode: '1234567891', category: 'Beverages' },
  { name: 'Sprite', price: 25, stock: 40, sku: 'SPRITE001', barcode: '1234567892', category: 'Beverages' },
  { name: 'Royal', price: 25, stock: 35, sku: 'ROYAL001', barcode: '1234567893', category: 'Beverages' },
  { name: 'Mountain Dew', price: 25, stock: 30, sku: 'MTDEW001', barcode: '1234567894', category: 'Beverages' },
  { name: 'Coke Zero', price: 28, stock: 25, sku: 'COKEZ001', barcode: '1234567895', category: 'Beverages' },
  { name: 'Pepsi Max', price: 28, stock: 20, sku: 'PEPMAX001', barcode: '1234567896', category: 'Beverages' },
  { name: '7-Up', price: 25, stock: 15, sku: '7UP001', barcode: '1234567897', category: 'Beverages' },
  { name: 'Mirinda', price: 25, stock: 10, sku: 'MIR001', barcode: '1234567898', category: 'Beverages' },
  { name: 'Fanta', price: 25, stock: 8, sku: 'FANTA001', barcode: '1234567899', category: 'Beverages' },
  { name: 'Red Bull', price: 75, stock: 50, sku: 'RB001', barcode: '1234567900', category: 'Beverages' },
  { name: 'Monster', price: 85, stock: 45, sku: 'MON001', barcode: '1234567901', category: 'Beverages' },
  { name: 'Gatorade', price: 45, stock: 40, sku: 'GAT001', barcode: '1234567902', category: 'Beverages' },
  { name: 'Powerade', price: 45, stock: 35, sku: 'POW001', barcode: '1234567903', category: 'Beverages' },
  { name: 'C2 Green Tea', price: 30, stock: 10, sku: 'C2001', barcode: '1234567908', category: 'Beverages' },
  { name: 'Nestea', price: 30, stock: 8, sku: 'NESTEA001', barcode: '1234567909', category: 'Beverages' },
  { name: 'Lipton', price: 32, stock: 50, sku: 'LIP001', barcode: '1234567910', category: 'Beverages' },
  { name: 'Sting', price: 30, stock: 45, sku: 'STING001', barcode: '1234567911', category: 'Beverages' },
  { name: 'Cobra', price: 30, stock: 40, sku: 'COB001', barcode: '1234567912', category: 'Beverages' },
  { name: 'Cobra Energy', price: 35, stock: 35, sku: 'COBE001', barcode: '1234567913', category: 'Beverages' },
  { name: 'Cobra Gold', price: 40, stock: 30, sku: 'COBG001', barcode: '1234567914', category: 'Beverages' },
  { name: 'Cobra Silver', price: 38, stock: 25, sku: 'COBS001', barcode: '1234567915', category: 'Beverages' },
  { name: 'Cobra Platinum', price: 45, stock: 20, sku: 'COBP001', barcode: '1234567916', category: 'Beverages' },
  { name: 'Cobra Diamond', price: 50, stock: 15, sku: 'COBD001', barcode: '1234567917', category: 'Beverages' },
  { name: 'Cobra Titanium', price: 55, stock: 10, sku: 'COBT001', barcode: '1234567918', category: 'Beverages' },
  { name: 'Cobra Ultimate', price: 60, stock: 8, sku: 'COBU001', barcode: '1234567919', category: 'Beverages' },
  // Food Items
  { name: 'Lucky Me Pancit Canton', price: 15, stock: 100, sku: 'LMPC001', barcode: '1234567920', category: 'Food Items' },
  { name: 'Lucky Me Beef Noodles', price: 15, stock: 95, sku: 'LMBN001', barcode: '1234567921', category: 'Food Items' },
  { name: 'Lucky Me Chicken Noodles', price: 15, stock: 90, sku: 'LMCN001', barcode: '1234567922', category: 'Food Items' },
  { name: 'Nissin Cup Noodles', price: 35, stock: 80, sku: 'NCN001', barcode: '1234567923', category: 'Food Items' },
  { name: 'Sky Flakes', price: 25, stock: 75, sku: 'SF001', barcode: '1234567924', category: 'Food Items' },
  { name: 'Fita Biscuits', price: 30, stock: 70, sku: 'FB001', barcode: '1234567925', category: 'Food Items' },
  { name: 'Rebisco Crackers', price: 28, stock: 65, sku: 'RC001', barcode: '1234567926', category: 'Food Items' },
  { name: 'Oreo Cookies', price: 45, stock: 60, sku: 'OC001', barcode: '1234567927', category: 'Food Items' },
  // Personal Care
  { name: 'Safeguard Soap', price: 35, stock: 50, sku: 'SGS001', barcode: '1234567928', category: 'Personal Care' },
  { name: 'Dove Soap', price: 45, stock: 45, sku: 'DS001', barcode: '1234567929', category: 'Personal Care' },
  { name: 'Colgate Toothpaste', price: 55, stock: 40, sku: 'CT001', barcode: '1234567930', category: 'Personal Care' },
  { name: 'Crest Toothpaste', price: 60, stock: 35, sku: 'CRT001', barcode: '1234567931', category: 'Personal Care' },
  { name: 'Head & Shoulders Shampoo', price: 120, stock: 30, sku: 'HSS001', barcode: '1234567932', category: 'Personal Care' },
  { name: 'Pantene Shampoo', price: 110, stock: 25, sku: 'PS001', barcode: '1234567933', category: 'Personal Care' },
  { name: 'Sunsilk Shampoo', price: 100, stock: 20, sku: 'SS001', barcode: '1234567934', category: 'Personal Care' },
  // Household Items
  { name: 'Tide Detergent', price: 85, stock: 40, sku: 'TD001', barcode: '1234567935', category: 'Household Items' },
  { name: 'Ariel Detergent', price: 90, stock: 35, sku: 'AD001', barcode: '1234567936', category: 'Household Items' },
  { name: 'Downy Fabric Softener', price: 75, stock: 30, sku: 'DFS001', barcode: '1234567937', category: 'Household Items' },
  { name: 'Zonrox Bleach', price: 40, stock: 25, sku: 'ZB001', barcode: '1234567938', category: 'Household Items' },
  { name: 'Mr. Muscle Cleaner', price: 95, stock: 20, sku: 'MMC001', barcode: '1234567939', category: 'Household Items' },
  { name: 'Glade Air Freshener', price: 65, stock: 15, sku: 'GAF001', barcode: '1234567940', category: 'Household Items' },
  // Electronics
  { name: 'AA Batteries', price: 50, stock: 60, sku: 'AAB001', barcode: '1234567941', category: 'Electronics' },
  { name: 'AAA Batteries', price: 45, stock: 55, sku: 'AAAB001', barcode: '1234567942', category: 'Electronics' },
  { name: 'USB Cable', price: 120, stock: 40, sku: 'USBC001', barcode: '1234567943', category: 'Electronics' },
  { name: 'Phone Charger', price: 150, stock: 35, sku: 'PC001', barcode: '1234567944', category: 'Electronics' },
  { name: 'LED Bulb', price: 80, stock: 30, sku: 'LED001', barcode: '1234567945', category: 'Electronics' },
  // Others
  { name: 'Vitamilk', price: 35, stock: 30, sku: 'VITA001', barcode: '1234567904', category: 'Others' },
  { name: 'Bear Brand', price: 40, stock: 25, sku: 'BEAR001', barcode: '1234567905', category: 'Others' },
  { name: 'Nestle Milk', price: 38, stock: 20, sku: 'NEST001', barcode: '1234567906', category: 'Others' },
  { name: 'Alaska Milk', price: 36, stock: 15, sku: 'ALAS001', barcode: '1234567907', category: 'Others' },
];

// Check if product already exists by SKU
const productExists = async (categoryPath, sku) => {
  try {
    const existingProducts = await getNestedCollection(categoryPath);
    return existingProducts.some(p => p.sku === sku);
  } catch (error) {
    return false;
  }
};

// Migrate all products to Firebase
export const migrateProductsToFirebase = async () => {
  console.log('Starting product migration...');
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Group products by category
  const productsByCategory = {};
  dummyProducts.forEach(product => {
    if (!productsByCategory[product.category]) {
      productsByCategory[product.category] = [];
    }
    productsByCategory[product.category].push(product);
  });

  // Migrate products by category
  for (const [category, products] of Object.entries(productsByCategory)) {
    console.log(`\nMigrating ${products.length} products to category: ${category}`);
    const categoryPath = buildProductsPath(category);

    for (const product of products) {
      try {
        // Check if product already exists
        const exists = await productExists(categoryPath, product.sku);
        if (exists) {
          console.log(`  ⏭️  Skipping ${product.name} (already exists)`);
          skipCount++;
          continue;
        }

        // Add product to Firebase
        const productData = {
          ...product,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await addNestedDocument(categoryPath, productData);
        console.log(`  ✅ Added ${product.name}`);
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`  ❌ Error adding ${product.name}:`, error.message);
        errorCount++;
      }
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`✅ Successfully added: ${successCount}`);
  console.log(`⏭️  Skipped (already exists): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📦 Total products processed: ${dummyProducts.length}`);

  return {
    success: successCount,
    skipped: skipCount,
    errors: errorCount,
    total: dummyProducts.length,
  };
};

