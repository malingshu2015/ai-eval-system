import sqlite3

db_path = '/Users/robinxie/01-开发项目/AI评估系统/backend/ai_eval.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 找到所有的 check_results
cursor.execute("SELECT id, session_id, check_item_id FROM check_results")
results = cursor.fetchall()

# 找到当前的 check_items (code -> id mapping for each template? No, check_items codes are unique per template. Since we only have a few, let's just map code -> new_id)
cursor.execute("SELECT hex(id), code FROM check_items")
items = cursor.fetchall()
code_to_new_id = {code: hex_id for hex_id, code in items}

# 我们还需要找到旧的 check_item_id 对应的 code。但是旧的 check_item 已经被删除了！
# 如果旧的 check_item 已经被删除了，我们怎么知道旧的 check_item_id 是哪个 code？
# 没办法直接知道，除非我们按顺序猜，或者直接让用户新建一个。
