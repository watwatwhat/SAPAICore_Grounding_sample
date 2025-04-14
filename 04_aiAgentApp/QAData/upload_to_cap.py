import pandas as pd
import requests
import json
import uuid
import base64
import math

# ===== 設定 =====
CSV_FILE = "data.csv"
API_BASE = ""
BATCH_URL = f"{API_BASE}/odata/v4/GPT/$batch"
USERNAME = ""
PASSWORD = ""
BATCH_SIZE = 10
# ===============

def create_auth_header():
    token = f"{USERNAME}:{PASSWORD}"
    return base64.b64encode(token.encode()).decode()
def build_changeset_item(content_id, entry):
    payload = {
        "question": entry["QUESTION"],
        "answer": entry["ANSWER"],
        "metadata": json.dumps(json.loads(entry["METADATA"]))
    }

    return (
        f"--changeset_{content_id}\r\n"
        "Content-Type: application/http\r\n"
        "Content-Transfer-Encoding: binary\r\n"
        f"Content-ID: {content_id}\r\n\r\n"
        "POST /Qahistory HTTP/1.1\r\n"
        f"Host: {API_BASE.replace('https://', '')}\r\n"
        "Content-Type: application/json; charset=utf-8\r\n"
        "Accept: application/json\r\n\r\n"
        f"{json.dumps(payload)}\r\n"
    )

def build_batch_payload(entries):
    batch_id = uuid.uuid4().hex
    changeset_id = uuid.uuid4().hex
    boundary_changeset = f"changeset_{changeset_id}"
    boundary_batch = f"batch_{batch_id}"

    batch_body = f"--{boundary_batch}\r\n"
    batch_body += f"Content-Type: multipart/mixed; boundary={boundary_changeset}\r\n\r\n"

    for idx, entry in enumerate(entries, start=1):
        batch_body += build_changeset_item(idx, entry)

    batch_body += f"--{boundary_changeset}--\r\n"
    batch_body += f"--{boundary_batch}--\r\n"

    return batch_body, batch_id



def main():
    df = pd.read_csv(CSV_FILE)
    total_rows = len(df)

    # 対話的に開始・終了インデックスを取得
    print(f"📄 読み込んだCSVの行数: {total_rows}")
    while True:
        try:
            start_index = int(input("🔢 開始インデックス（0始まり）を入力してください: "))
            end_index = int(input("🔢 終了インデックス（0始まり）を入力してください: "))
            if start_index < 0 or end_index >= total_rows or start_index > end_index:
                raise ValueError()
            break
        except ValueError:
            print("❌ 無効なインデックスです。範囲を見直してください。")

    df = df.iloc[start_index:end_index + 1]
    total_batches = math.ceil(len(df) / BATCH_SIZE)

    auth_header = create_auth_header()
    headers_base = {
        "Authorization": f"Basic {auth_header}",
        "Accept": "application/json"
    }

    for i in range(total_batches):
        chunk = df.iloc[i * BATCH_SIZE:(i + 1) * BATCH_SIZE].to_dict(orient="records")
        body, batch_id = build_batch_payload(chunk)
        headers = headers_base.copy()
        headers["Content-Type"] = f"multipart/mixed; boundary=batch_{batch_id}"

        print(f"\n🚀 Batch {i+1}/{total_batches} を送信中... ({len(chunk)} 件)")
        res = requests.post(BATCH_URL, headers=headers, data=body.encode("utf-8"))
        print(f"✅ ステータス: {res.status_code}")
        print(res.text[:300], "\n---\n")  # 最初の300文字だけ出力

if __name__ == "__main__":
    main()
