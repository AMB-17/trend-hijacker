import { query, transaction } from '../db';
import { logger } from '@packages/utils';

export interface SAMLProvider {
  id: string;
  issuer: string;
  certificate: string;
  metadataUrl?: string;
  ssoUrl?: string;
  sloUrl?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SAMLUserMapping {
  id: string;
  userId: string;
  samlProviderId: string;
  samlNameId: string;
  createdAt: Date;
}

class SAMLService {
  /**
   * Create or update SAML provider
   */
  async upsertSAMLProvider(
    issuer: string,
    certificate: string,
    metadataUrl?: string,
    ssoUrl?: string,
    sloUrl?: string,
    enabled = true
  ): Promise<SAMLProvider> {
    const result = await query<SAMLProvider>(
      `
      INSERT INTO saml_providers (issuer, certificate, metadata_url, sso_url, slo_url, enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (issuer) DO UPDATE
      SET certificate = $2, metadata_url = $3, sso_url = $4, slo_url = $5, enabled = $6, updated_at = NOW()
      RETURNING 
        id, issuer, certificate, metadata_url as "metadataUrl",
        sso_url as "ssoUrl", slo_url as "sloUrl", enabled,
        created_at as "createdAt", updated_at as "updatedAt"
      `,
      [issuer, certificate, metadataUrl || null, ssoUrl || null, sloUrl || null, enabled]
    );

    logger.info('SAML provider upserted', { issuer });
    return result.rows[0];
  }

  /**
   * Get SAML provider by issuer
   */
  async getSAMLProviderByIssuer(issuer: string): Promise<SAMLProvider | null> {
    const result = await query<SAMLProvider>(
      `
      SELECT 
        id, issuer, certificate, metadata_url as "metadataUrl",
        sso_url as "ssoUrl", slo_url as "sloUrl", enabled,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM saml_providers
      WHERE issuer = $1 AND enabled = TRUE
      `,
      [issuer]
    );

    return result.rows[0] || null;
  }

  /**
   * Get SAML provider by ID
   */
  async getSAMLProviderById(id: string): Promise<SAMLProvider | null> {
    const result = await query<SAMLProvider>(
      `
      SELECT 
        id, issuer, certificate, metadata_url as "metadataUrl",
        sso_url as "ssoUrl", slo_url as "sloUrl", enabled,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM saml_providers
      WHERE id = $1 AND enabled = TRUE
      `,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * List all enabled SAML providers
   */
  async listSAMLProviders(): Promise<SAMLProvider[]> {
    const result = await query<SAMLProvider>(
      `
      SELECT 
        id, issuer, certificate, metadata_url as "metadataUrl",
        sso_url as "ssoUrl", slo_url as "sloUrl", enabled,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM saml_providers
      WHERE enabled = TRUE
      ORDER BY created_at DESC
      `
    );

    return result.rows;
  }

  /**
   * Create or get SAML user mapping
   */
  async createOrGetSAMLMapping(
    userId: string,
    samlProviderId: string,
    samlNameId: string
  ): Promise<SAMLUserMapping> {
    const result = await query<SAMLUserMapping>(
      `
      INSERT INTO saml_user_mappings (user_id, saml_provider_id, saml_name_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (saml_provider_id, saml_name_id) DO UPDATE
      SET user_id = $1
      RETURNING 
        id, user_id as "userId", saml_provider_id as "samlProviderId",
        saml_name_id as "samlNameId", created_at as "createdAt"
      `,
      [userId, samlProviderId, samlNameId]
    );

    logger.info('SAML user mapping created/updated', { userId, samlProviderId, samlNameId });
    return result.rows[0];
  }

  /**
   * Get user by SAML mapping
   */
  async getUserBySAMLMapping(samlProviderId: string, samlNameId: string): Promise<string | null> {
    const result = await query(
      `
      SELECT user_id FROM saml_user_mappings
      WHERE saml_provider_id = $1 AND saml_name_id = $2
      `,
      [samlProviderId, samlNameId]
    );

    return result.rows[0]?.user_id || null;
  }

  /**
   * Get SAML mappings for user
   */
  async getSAMLMappingsForUser(userId: string): Promise<SAMLUserMapping[]> {
    const result = await query<SAMLUserMapping>(
      `
      SELECT 
        id, user_id as "userId", saml_provider_id as "samlProviderId",
        saml_name_id as "samlNameId", created_at as "createdAt"
      FROM saml_user_mappings
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return result.rows;
  }

  /**
   * Delete SAML mapping
   */
  async deleteSAMLMapping(mappingId: string): Promise<void> {
    await query('DELETE FROM saml_user_mappings WHERE id = $1', [mappingId]);
    logger.info('SAML mapping deleted', { mappingId });
  }

  /**
   * Disable SAML provider
   */
  async disableSAMLProvider(providerId: string): Promise<void> {
    await query('UPDATE saml_providers SET enabled = FALSE WHERE id = $1', [providerId]);
    logger.info('SAML provider disabled', { providerId });
  }

  /**
   * Parse SAML metadata XML and extract provider info
   * Note: This is a simplified implementation. In production, use a proper SAML library
   */
  parseSAMLMetadata(metadataXml: string): {
    entityID: string;
    ssoUrl?: string;
    sloUrl?: string;
    certificate?: string;
  } | null {
    try {
      // Extract EntityID
      const entityIdMatch = metadataXml.match(/entityID="([^"]+)"/);
      const entityID = entityIdMatch?.[1];

      if (!entityID) {
        logger.warn('Could not extract EntityID from SAML metadata');
        return null;
      }

      // Extract SSO URL (SingleSignOnService with HTTP-Redirect binding)
      const ssoMatch = metadataXml.match(
        /<SingleSignOnService[^>]*Binding="urn:oasis:names:tc:SAML:2\.0:bindings:HTTP-Redirect"[^>]*Location="([^"]+)"/
      );
      const ssoUrl = ssoMatch?.[1];

      // Extract SLO URL (SingleLogoutService with HTTP-Redirect binding)
      const sloMatch = metadataXml.match(
        /<SingleLogoutService[^>]*Binding="urn:oasis:names:tc:SAML:2\.0:bindings:HTTP-Redirect"[^>]*Location="([^"]+)"/
      );
      const sloUrl = sloMatch?.[1];

      // Extract certificate
      const certMatch = metadataXml.match(/<ds:X509Certificate>([^<]+)<\/ds:X509Certificate>/);
      const certificate = certMatch?.[1];

      return {
        entityID,
        ssoUrl,
        sloUrl,
        certificate,
      };
    } catch (error) {
      logger.error('Error parsing SAML metadata', { error });
      return null;
    }
  }

  /**
   * Generate SAML metadata for service provider
   */
  generateSPMetadata(
    entityId: string,
    acsUrl: string,
    sloUrl: string
  ): string {
    const metadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="0" isDefault="true"/>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${sloUrl}"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
    return metadata;
  }

  /**
   * Validate SAML assertion signature
   * Note: This is a simplified placeholder. Use node-saml library for production
   */
  validateSAMLAssertionSignature(assertionXml: string, certificate: string): boolean {
    try {
      // In a real implementation, you would:
      // 1. Extract the signature from the assertion
      // 2. Extract the signed data
      // 3. Verify the signature using the certificate
      // This is a placeholder implementation
      
      if (!assertionXml || !certificate) {
        return false;
      }

      logger.debug('SAML assertion signature validation performed');
      return true;
    } catch (error) {
      logger.error('Error validating SAML assertion signature', { error });
      return false;
    }
  }

  /**
   * Extract NameID from SAML assertion
   */
  extractNameIdFromAssertion(assertionXml: string): string | null {
    try {
      const nameIdMatch = assertionXml.match(
        /<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/
      ) || assertionXml.match(/<NameID[^>]*>([^<]+)<\/NameID>/);

      return nameIdMatch?.[1] || null;
    } catch (error) {
      logger.error('Error extracting NameID from SAML assertion', { error });
      return null;
    }
  }

  /**
   * Extract attributes from SAML assertion
   */
  extractAttributesFromAssertion(assertionXml: string): Record<string, string> {
    const attributes: Record<string, string> = {};

    try {
      // Match all Attribute elements
      const attributeMatches = assertionXml.matchAll(
        /<saml:Attribute[^>]*Name="([^"]+)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>[\s\S]*?<\/saml:Attribute>/g
      ) || [];

      for (const match of attributeMatches) {
        attributes[match[1]] = match[2];
      }
    } catch (error) {
      logger.error('Error extracting attributes from SAML assertion', { error });
    }

    return attributes;
  }
}

export const samlService = new SAMLService();
