# Account-deletion page (EC2 static, existing api subdomain)

Live: https://vitalvue-api.genesysailabs.com/delete-account

Served by host nginx on the EC2 (NOT S3/CloudFront). Static folder, posts to the
same-origin backend endpoint `/api/v1/account/deletion-request`.

## Deploy / update
1. Edit `deploy/vitalvue-static/delete-account/index.html`.
2. scp to server, place at `/var/www/vitalvue-static/delete-account/index.html`
   (owner www-data, 755).
3. nginx: `/etc/nginx/sites-available/vitalvue` has a `location /delete-account`
   block (root /var/www/vitalvue-static; try_files ... /delete-account/index.html)
   inserted before `location /`. Backup: `vitalvue.pre-delacct.bak`.
4. `sudo nginx -t && sudo systemctl reload nginx`.

No DNS change, no AWS creds, no CloudFront. Additive; existing api proxy untouched.
