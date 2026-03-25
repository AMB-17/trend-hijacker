const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'apps', 'api', 'src', 'schema.ts');
const content = fs.readFileSync(schemaPath, 'utf8');
const lastBacktick = content.lastIndexOf('`');

const auditSQL = `

   -- Audit logs (immutable)
   CREATE TABLE IF NOT EXISTS audit_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE SET NULL,
     action VARCHAR(100) NOT NULL,
     resource_type VARCHAR(100),
     resource_id UUID,
     before_value JSONB,
     after_value JSONB,
     ip_address INET,
     user_agent TEXT,
     status VARCHAR(50) DEFAULT 'success',
     error_message VARCHAR(500),
     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
   CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
   CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
   CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

   -- Data retention policies
   CREATE TABLE IF NOT EXISTS retention_policies (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     workspace_id UUID NOT NULL,
     data_type VARCHAR(100) NOT NULL,
     retention_days INT NOT NULL DEFAULT 90,
     archive_location VARCHAR(500),
     enabled BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Data deletion requests (GDPR)
   CREATE TABLE IF NOT EXISTS data_deletion_requests (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     status VARCHAR(50) DEFAULT 'pending',
     completed_at TIMESTAMP,
     error_message VARCHAR(500),
     anonymized_data BOOLEAN DEFAULT TRUE
   );
   CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
   CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);

   -- Exported user data
   CREATE TABLE IF NOT EXISTS exported_data (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     export_type VARCHAR(100) NOT NULL,
     file_size_bytes BIGINT,
     download_token VARCHAR(255) UNIQUE NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     expires_at TIMESTAMP NOT NULL,
     downloaded_at TIMESTAMP
   );
   CREATE INDEX IF NOT EXISTS idx_exported_data_user_id ON exported_data(user_id);
   CREATE INDEX IF NOT EXISTS idx_exported_data_download_token ON exported_data(download_token);`;

const newContent = content.slice(0, lastBacktick) + auditSQL + '\n' + content.slice(lastBacktick);
fs.writeFileSync(schemaPath, newContent, 'utf8');
console.log('✓ Schema updated with audit tables');
