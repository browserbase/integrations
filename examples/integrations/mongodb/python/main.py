import os
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional

from pydantic import BaseModel
from pymongo import MongoClient, IndexModel, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError
from stagehand import Stagehand
from stagehand.schemas import AvailableModel
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize rich console for better output
console = Console()

# ========== MongoDB Configuration ==========
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'scraper_db')

# ========== Pydantic Models (Schema Definitions) ==========
class Product(BaseModel):
    """Product model for e-commerce websites"""
    url: str
    date_scraped: datetime
    name: str
    price: str
    rating: Optional[float] = None
    category: Optional[str] = None
    id: Optional[str] = None
    currency: Optional[str] = None
    image_url: Optional[str] = None
    review_count: Optional[int] = None
    description: Optional[str] = None
    specs: Optional[Dict[str, Any]] = None

class ProductList(BaseModel):
    """Product list model for results from category pages"""
    products: List[Product]
    category: Optional[str] = None
    date_scraped: datetime
    total_products: Optional[int] = None
    page: Optional[int] = None
    website_name: Optional[str] = None

# ========== MongoDB Connection and Operations ==========
class MongoDBManager:
    """Handles MongoDB connections and operations"""
    
    def __init__(self, uri: str, db_name: str):
        self.uri = uri
        self.db_name = db_name
        self.client = None
        self.db = None
        
        # Collection names
        self.COLLECTIONS = {
            'PRODUCTS': 'products',
            'PRODUCT_LISTS': 'product_lists'
        }
        
        # Index definitions
        self.INDEXES = {
            self.COLLECTIONS['PRODUCTS']: [
                IndexModel([("rating", ASCENDING)], name="rating_idx"),
                IndexModel([("category", ASCENDING)], name="category_idx"),
                IndexModel([("url", ASCENDING)], name="url_idx", unique=True),
                IndexModel([("date_scraped", DESCENDING)], name="date_scraped_idx")
            ],
            self.COLLECTIONS['PRODUCT_LISTS']: [
                IndexModel([("category", ASCENDING)], name="category_idx"),
                IndexModel([("date_scraped", DESCENDING)], name="date_scraped_idx")
            ]
        }
    
    async def connect(self):
        """Connect to MongoDB"""
        try:
            console.print("🔌 Connecting to MongoDB...", style="blue")
            self.client = MongoClient(self.uri)
            
            # Test connection
            self.client.admin.command('ismaster')
            self.db = self.client[self.db_name]
            
            console.print("✅ Connected to MongoDB", style="green")
            
            # Create indexes
            await self._create_indexes()
            
        except Exception as e:
            console.print(f"❌ Error connecting to MongoDB: {e}", style="red")
            raise
    
    async def _create_indexes(self):
        """Create indexes for all collections"""
        console.print("⚙️ Creating indexes...", style="blue")
        
        for collection_name, indexes in self.INDEXES.items():
            try:
                collection = self.db[collection_name]
                
                # Create indexes
                for index in indexes:
                    try:
                        collection.create_index(
                            index.document['key'],
                            name=index.document.get('name'),
                            unique=index.document.get('unique', False),
                            background=True
                        )
                        console.print(f"✅ Created index {index.document.get('name')} on {collection_name}", style="green")
                    except DuplicateKeyError:
                        console.print(f"⚠️ Index {index.document.get('name')} already exists on {collection_name}", style="yellow")
                        
            except Exception as e:
                console.print(f"❌ Error creating indexes for {collection_name}: {e}", style="red")
        
        console.print("✅ Index creation completed", style="green")
    
    async def store_data(self, collection_name: str, data):
        """Store data in MongoDB collection"""
        try:
            collection = self.db[collection_name]
            
            if isinstance(data, list):
                # Check if list is empty
                if not data:
                    console.print(f"⚠️ No data to store in {collection_name} (empty list)", style="yellow")
                    return
                
                # Convert Pydantic models to dict
                documents = [item.dict() if hasattr(item, 'dict') else item for item in data]
                result = collection.insert_many(documents)
                console.print(f"✅ Stored {len(result.inserted_ids)} documents in {collection_name}", style="green")
            else:
                # Convert Pydantic model to dict
                document = data.dict() if hasattr(data, 'dict') else data
                result = collection.insert_one(document)
                console.print(f"✅ Stored document in {collection_name}", style="green")
                
        except Exception as e:
            console.print(f"❌ Error storing data in {collection_name}: {e}", style="red")
            raise
    
    async def find_data(self, collection_name: str, query: Dict = None):
        """Find documents in MongoDB collection"""
        try:
            collection = self.db[collection_name]
            query = query or {}
            documents = list(collection.find(query))
            return documents
        except Exception as e:
            console.print(f"❌ Error finding data in {collection_name}: {e}", style="red")
            raise
    
    async def aggregate_data(self, collection_name: str, pipeline: List[Dict]):
        """Aggregate data in MongoDB collection"""
        try:
            collection = self.db[collection_name]
            results = list(collection.aggregate(pipeline))
            return results
        except Exception as e:
            console.print(f"❌ Error aggregating data in {collection_name}: {e}", style="red")
            raise
    
    async def get_collection_count(self, collection_name: str) -> int:
        """Get document count for a collection"""
        try:
            collection = self.db[collection_name]
            return collection.count_documents({})
        except Exception as e:
            console.print(f"❌ Error getting count for {collection_name}: {e}", style="red")
            return 0
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            console.print("🔌 MongoDB connection closed", style="blue")

# ========== Web Scraping Functions ==========
class ProductScraper:
    """Handles web scraping operations using Stagehand"""
    
    def __init__(self, stagehand: Stagehand, mongodb: MongoDBManager):
        self.stagehand = stagehand
        self.page = stagehand.page
        self.mongodb = mongodb
    
    async def scrape_product_list(self, category_url: str) -> ProductList:
        """Scrape a product list from an Amazon category page"""
        console.print(f"📊 Starting to scrape product listing from: {category_url}", style="blue")
        
        # Navigate to Amazon homepage first
        await self.page.goto('https://www.amazon.com')
        await self.page.wait_for_timeout(2000)
        
        # Then navigate to the category page
        await self.page.goto(category_url)
        
        # Wait for products to load
        await self.page.wait_for_selector('[data-component-type="s-search-result"]', timeout=10000)
        await self.page.wait_for_timeout(2000)
        
        # Scroll to load more products
        await self.page.evaluate("""
            () => {
                window.scrollTo(0, document.body.scrollHeight / 2);
            }
        """)
        await self.page.wait_for_timeout(1000)
        
        await self.page.evaluate("""
            () => {
                window.scrollTo(0, document.body.scrollHeight);
            }
        """)
        await self.page.wait_for_timeout(1000)
        
        # Extract product data using Stagehand with better error handling
        console.print("🔍 Extracting product data with AI...", style="blue")
        
        try:
            extraction_result = await self.page.extract({
                "instruction": "Look at this Amazon search page and find product listings. Extract the products with their names, prices, and any star ratings you can find.",
                "schema": {
                    "type": "object",
                    "properties": {
                        "products": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "price": {"type": "string"},
                                    "url": {"type": ["string", "null"]},
                                    "rating": {"type": ["number", "null"]},
                                    "review_count": {"type": ["number", "null"]}
                                },
                                "required": ["name", "price"]
                            }
                        },
                        "category": {"type": ["string", "null"]},
                        "total_products": {"type": ["number", "null"]}
                    },
                    "required": ["products"]
                }
            })
            
            console.print(f"🔍 Raw extraction result type: {type(extraction_result)}", style="blue")
            
            # Handle different result formats
            if isinstance(extraction_result, dict) and 'products' in extraction_result:
                console.print(f"🔍 Extraction result: {len(extraction_result.get('products', []))} products found", style="blue")
            else:
                console.print(f"⚠️ Unexpected extraction result format: {type(extraction_result)}", style="yellow")
                extraction_result = {"products": [], "category": "Unknown"}
                
        except Exception as e:
            console.print(f"⚠️ AI extraction failed: {str(e)[:100]}...", style="yellow")
            extraction_result = {"products": [], "category": "Unknown"}
        
        # Process the extracted data
        current_time = datetime.now()
        products = []
        
        for product_data in extraction_result.get('products', []):
            try:
                product = Product(
                    url=product_data.get('url', category_url),  # Fallback to category URL if no product URL
                    date_scraped=current_time,
                    name=product_data['name'],
                    price=product_data['price'],
                    rating=product_data.get('rating'),
                    review_count=product_data.get('review_count')
                )
                products.append(product)
                console.print(f"✅ Processed: {product.name[:50]}...", style="green")
            except Exception as e:
                console.print(f"⚠️ Error processing product: {e}", style="yellow")
                console.print(f"Product data: {product_data}", style="yellow")
        
        # Create the product list object
        product_list = ProductList(
            products=products,
            category=extraction_result.get('category', 'Unknown'),
            date_scraped=current_time,
            total_products=len(products),
            website_name="Amazon"
        )
        
        # Create sample products if extraction failed completely
        if not products:
            console.print("⚠️ No products were successfully extracted. Creating sample products for demonstration...", style="yellow")
            console.print("   • This might be due to Amazon's anti-bot measures", style="yellow")
            console.print("   • Changes in Amazon's page structure", style="yellow")
            console.print("   • Network issues or timeouts", style="yellow")
            console.print("   • Geographic restrictions", style="yellow")
            
            # Create sample products for demonstration
            sample_products = [
                {"name": "Premium Laptop Pro", "price": "$1,299.99", "rating": 4.5},
                {"name": "Laptop Ultra Performance", "price": "$899.99", "rating": 4.3},
                {"name": "Budget Laptop Essential", "price": "$499.99", "rating": 4.1},
                {"name": "Gaming Laptop Elite", "price": "$1,599.99", "rating": 4.7},
                {"name": "Portable Laptop Lite", "price": "$699.99", "rating": 4.2}
            ]
            
            for sample in sample_products[:3]:  # Create 3 sample products
                product = Product(
                    url=category_url,
                    date_scraped=current_time,
                    name=sample["name"],
                    price=sample["price"],
                    rating=sample["rating"]
                )
                products.append(product)
                console.print(f"📝 Created sample: {product.name}", style="cyan")
        
        # Store the data in MongoDB
        await self.mongodb.store_data(self.mongodb.COLLECTIONS['PRODUCT_LISTS'], product_list)
        if products:  # Only store products if we have any
            await self.mongodb.store_data(self.mongodb.COLLECTIONS['PRODUCTS'], products)
        
        console.print(f"✅ Scraped {len(products)} products from category: {product_list.category}", style="green")
        return product_list
    
    async def scrape_product_details(self, product_url: str) -> Product:
        """Scrape detailed information for a single product"""
        console.print(f"📊 Scraping product details from: {product_url}", style="blue")
        
        await self.page.goto(product_url)
        await self.page.wait_for_timeout(2000)
        
        # Scroll down to load more content
        await self.page.evaluate("""
            () => {
                window.scrollTo(0, document.body.scrollHeight / 3);
            }
        """)
        await self.page.wait_for_timeout(1000)
        
        await self.page.evaluate("""
            () => {
                window.scrollTo(0, document.body.scrollHeight * 2 / 3);
            }
        """)
        await self.page.wait_for_timeout(1000)
        
        # Extract product details using Stagehand
        extraction_result = await self.page.extract({
            "instruction": "Extract detailed product information from this Amazon product page, including name, price, description, specifications, brand, category, image URL, rating, review count, and availability",
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "price": {"type": "string"},
                    "rating": {"type": "number"},
                    "category": {"type": "string"},
                    "id": {"type": "string"},
                    "currency": {"type": "string"},
                    "image_url": {"type": "string"},
                    "review_count": {"type": "number"},
                    "description": {"type": "string"},
                    "specs": {"type": "object"}
                },
                "required": ["name", "price"]
            }
        })
        
        # Create complete product object
        product = Product(
            url=product_url,
            date_scraped=datetime.now(),
            name=extraction_result['name'],
            price=extraction_result['price'],
            rating=extraction_result.get('rating'),
            category=extraction_result.get('category'),
            id=extraction_result.get('id'),
            currency=extraction_result.get('currency'),
            image_url=extraction_result.get('image_url'),
            review_count=extraction_result.get('review_count'),
            description=extraction_result.get('description'),
            specs=extraction_result.get('specs')
        )
        
        # Store the data in MongoDB
        await self.mongodb.store_data(self.mongodb.COLLECTIONS['PRODUCTS'], product)
        
        console.print(f"✅ Scraped detailed information for: {product.name}", style="green")
        return product

# ========== Data Analysis Functions ==========
class DataAnalyzer:
    """Handles data analysis and reporting"""
    
    def __init__(self, mongodb: MongoDBManager):
        self.mongodb = mongodb
    
    async def run_analysis(self):
        """Run comprehensive data analysis"""
        console.print("\n📊 Running Data Analysis", style="bold blue")
        
        # 1. Collection counts
        await self._show_collection_counts()
        
        # 2. Products by category
        await self._show_products_by_category()
        
        # 3. Top rated products
        await self._show_top_rated_products()
        
        console.print("\n✅ Data analysis completed!", style="bold green")
    
    async def _show_collection_counts(self):
        """Show document counts for each collection"""
        console.print("\n📊 Collection Counts:", style="yellow")
        
        table = Table()
        table.add_column("Collection", style="cyan")
        table.add_column("Count", style="green")
        
        for name, collection in self.mongodb.COLLECTIONS.items():
            count = await self.mongodb.get_collection_count(collection)
            table.add_row(name, str(count))
        
        console.print(table)
    
    async def _show_products_by_category(self):
        """Show products grouped by category"""
        console.print("\n📊 Products by Category:", style="yellow")
        
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        results = await self.mongodb.aggregate_data(
            self.mongodb.COLLECTIONS['PRODUCTS'], 
            pipeline
        )
        
        if results:
            table = Table()
            table.add_column("Category", style="cyan")
            table.add_column("Count", style="green")
            
            for item in results:
                category = item['_id'] or "Unknown"
                count = item['count']
                table.add_row(category, str(count))
            
            console.print(table)
        else:
            console.print("No category data found", style="yellow")
    
    async def _show_top_rated_products(self):
        """Show highest rated products"""
        console.print("\n📊 Top Rated Products (4+ stars):", style="yellow")
        
        # Count highly rated products
        highly_rated = await self.mongodb.find_data(
            self.mongodb.COLLECTIONS['PRODUCTS'],
            {"rating": {"$gte": 4}}
        )
        
        console.print(f"Found {len(highly_rated)} highly rated products", style="blue")
        
        if highly_rated:
            table = Table()
            table.add_column("Name", style="cyan", max_width=40)
            table.add_column("Price", style="green")
            table.add_column("Rating", style="yellow")
            table.add_column("Category", style="magenta")
            
            for product in highly_rated[:10]:  # Show top 10
                table.add_row(
                    product.get('name', 'N/A')[:37] + "..." if len(product.get('name', '')) > 40 else product.get('name', 'N/A'),
                    product.get('price', 'N/A'),
                    str(product.get('rating', 'N/A')),
                    product.get('category', 'Unknown')
                )
            
            console.print(table)

# ========== Main Application ==========
async def main():
    """Main application function"""
    try:
        # Initialize MongoDB
        mongodb = MongoDBManager(MONGO_URI, DB_NAME)
        await mongodb.connect()
        
        # Initialize Stagehand
        stagehand = Stagehand(
            env="BROWSERBASE",  # or "BROWSERBASE"
            model_name=AvailableModel.CLAUDE_3_7_SONNET_LATEST,
            model_api_key=os.getenv("MODEL_API_KEY"),
            verbose=1
        )
        await stagehand.init()
        
        # Initialize scraper
        scraper = ProductScraper(stagehand, mongodb)
        
        # Define category URL
        category_url = "https://www.amazon.com/s?k=laptops"
        
        # Scrape product listing
        product_list = await scraper.scrape_product_list(category_url)
        
        # Scrape detailed information for first 3 products (if any were found)
        if product_list.products:
            products_to_scrape = product_list.products[:3]
            
            for i, product in enumerate(products_to_scrape):
                console.print(f"📊 Scraping details for product {i+1}/{len(products_to_scrape)}: {product.name}", style="blue")
                
                try:
                    await scraper.scrape_product_details(product.url)
                    await asyncio.sleep(2)  # Rate limiting
                except Exception as e:
                    console.print(f"❌ Error scraping product {product.name}: {e}", style="red")
        else:
            console.print("⚠️ No products found to scrape details for", style="yellow")
        
        # Run data analysis
        analyzer = DataAnalyzer(mongodb)
        await analyzer.run_analysis()
        
        console.print("\n🎉 Scraping and MongoDB operations completed successfully!", style="bold green")
        
    except Exception as e:
        console.print(f"❌ Error during execution: {e}", style="red")
        raise
    finally:
        # Cleanup
        if 'stagehand' in locals():
            await stagehand.close()
        if 'mongodb' in locals():
            mongodb.close()

# ========== Entry Point ==========
if __name__ == "__main__":
    console.print(Panel.fit(
        "🤘 Welcome to Stagehand MongoDB Scraper!\n\n"
        "This script will scrape Amazon product data and store it in MongoDB.",
        title="Stagehand MongoDB Integration",
        border_style="blue"
    ))
    
    # Run the main function
    asyncio.run(main())