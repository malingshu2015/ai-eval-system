
import asyncio
from sqlalchemy import text
from core.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Starting migration: Adding target_url to evaluation_sessions...")
        try:
            await conn.execute(text("ALTER TABLE evaluation_sessions ADD COLUMN target_url VARCHAR(512);"))
            print("Successfully added target_url column.")
        except Exception as e:
            print(f"Error (column might already exist): {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
