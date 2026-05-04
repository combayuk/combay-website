# Combay VPS Upload Receiver

This small Node service receives secure uploads from the Vercel app and saves them to:

`/var/www/combay-uploads`

Nginx serves those files publicly at:

`https://assets.combay.co.uk`

## VPS install

1. Copy this folder to the VPS:

```bash
scp -r vps-upload-receiver root@72.62.133.202:/opt/combay-upload-receiver
```

2. SSH into VPS and set ownership:

```bash
ssh root@72.62.133.202
chmod +x /opt/combay-upload-receiver/server.js
cp /opt/combay-upload-receiver/combay-upload-receiver.service /etc/systemd/system/combay-upload-receiver.service
```

3. Edit the systemd service and replace the secret:

```bash
nano /etc/systemd/system/combay-upload-receiver.service
```

Set:

`UPLOAD_RECEIVER_SECRET=your-long-random-secret`

4. Start service:

```bash
systemctl daemon-reload
systemctl enable combay-upload-receiver
systemctl start combay-upload-receiver
systemctl status combay-upload-receiver
```

5. Update Nginx `assets.combay.co.uk` config with this location block before the static `/` block:

```nginx
location /_upload {
    proxy_pass http://127.0.0.1:8787/upload;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50M;
}
```

Then reload:

```bash
nginx -t && systemctl reload nginx
```

6. Add Vercel env vars:

```env
UPLOAD_RECEIVER_URL=https://assets.combay.co.uk/_upload
UPLOAD_RECEIVER_SECRET=same-long-random-secret
```

Existing env vars should remain:

```env
UPLOAD_PROVIDER=vps
UPLOAD_BASE_URL=https://assets.combay.co.uk
UPLOAD_MAX_FILE_MB=50
```
