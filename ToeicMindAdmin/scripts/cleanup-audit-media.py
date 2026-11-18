"""Delete only audit-named objects registered in the isolated browser-test database."""
import hashlib
import hmac
import json
from datetime import datetime, timezone
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

backend = Path(__file__).resolve().parents[2] / "ToeicMindBE" / "ToeicMind"
runtime = json.loads((backend / "artifacts/admin-audit-runtime/runtime.json").read_text(encoding="utf-8-sig"))
database = runtime["database"]
if not re.fullmatch(r"ToeicMind_AdminAudit_[a-f0-9]{32}", database):
    raise RuntimeError("Refusing cleanup outside the isolated audit database")
result = subprocess.run(["sqlcmd", "-S", "localhost", "-E", "-C", "-d", database, "-h", "-1", "-W", "-Q",
    "SET NOCOUNT ON; SELECT StorageKey FROM dbo.Media WHERE StorageKey LIKE '%/audit-%'"], capture_output=True, check=True, text=True)
keys = [line.strip() for line in result.stdout.splitlines() if line.strip()]
if not keys:
    print("No audit media objects require cleanup.")
    sys.exit(0)
if len(keys) > 100 or any(not re.fullmatch(r"exams/\d+/p[1-4]/\d+/(?:clips/\d+/)?audit-[A-Za-z0-9_-]+\.(mp3|wav|png|jpg|jpeg)", key) for key in keys):
    raise RuntimeError("Unexpected audit media keys; cleanup stopped")
config = {}
for line in (backend / ".env").read_text(encoding="utf-8-sig").splitlines():
    match = re.match(r"^(R2__\w+)\s*=\s*['\"]?([^'\"]*)['\"]?\s*$", line)
    if match:
        config[match[1]] = match[2]
endpoint = urlsplit(config["R2__Endpoint"])
if endpoint.scheme != "https" or not re.fullmatch(r"[a-f0-9]{32}\.r2\.cloudflarestorage\.com", endpoint.netloc):
    raise RuntimeError("Unexpected R2 endpoint")
for key in keys:
    now = datetime.now(timezone.utc)
    timestamp, date = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    uri = "/" + quote(config["R2__BucketName"], safe="") + "/" + quote(key, safe="/")
    payload = hashlib.sha256(b"").hexdigest()
    headers = {"host": endpoint.netloc, "x-amz-content-sha256": payload, "x-amz-date": timestamp}
    signed = ";".join(sorted(headers))
    canonical = "\n".join(("DELETE", uri, "", "".join(k + ":" + headers[k] + "\n" for k in sorted(headers)), signed, payload))
    scope = f"{date}/auto/s3/aws4_request"
    signing_key = ("AWS4" + config["R2__SecretAccessKey"]).encode()
    for part in (date, "auto", "s3", "aws4_request"):
        signing_key = hmac.new(signing_key, part.encode(), hashlib.sha256).digest()
    signature = hmac.new(signing_key, "\n".join(("AWS4-HMAC-SHA256", timestamp, scope, hashlib.sha256(canonical.encode()).hexdigest())).encode(), hashlib.sha256).hexdigest()
    headers["Authorization"] = f"AWS4-HMAC-SHA256 Credential={config['R2__AccessKeyId']}/{scope}, SignedHeaders={signed}, Signature={signature}"
    with urlopen(Request(config["R2__Endpoint"].rstrip("/") + uri, headers=headers, method="DELETE"), timeout=20) as response:
        if response.status != 204:
            raise RuntimeError("R2 audit cleanup did not confirm deletion")
print(f"Removed {len(keys)} audit media objects; credentials and signed URLs not logged.")
