import fs from "fs";
import path from "path";
import { parse as csvParse } from "csv-parse/sync";
import * as XLSX from "xlsx";

export interface ConnectorConfig {
  type: "csv" | "excel" | "api" | "postgresql" | "mysql" | "salesforce" | "sap" | "vtex";
  name: string;
  config: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  duration: number;
}

// CSV Connector
export async function readCSV(filePath: string): Promise<unknown[]> {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const records = csvParse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });
    return records as unknown[];
  } catch (error) {
    throw new Error(`CSV Error: ${error}`);
  }
}

// Excel Connector
export async function readExcel(filePath: string, sheetName?: string): Promise<unknown[]> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json(sheet);
    return records as unknown[];
  } catch (error) {
    throw new Error(`Excel Error: ${error}`);
  }
}

// API Connector
export async function fetchFromAPI(url: string, headers?: Record<string, string>): Promise<unknown[]> {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    throw new Error(`API Error: ${error}`);
  }
}

// PostgreSQL Connector
export async function readPostgreSQL(
  connectionString: string,
  query: string
): Promise<unknown[]> {
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString });
    const result = await pool.query(query);
    await pool.end();
    return result.rows as unknown[];
  } catch (error) {
    throw new Error(`PostgreSQL Error: ${error}`);
  }
}

// MySQL Connector
export async function readMySQL(
  connectionString: string,
  query: string
): Promise<unknown[]> {
  try {
    const mysql = await import("mysql2/promise");
    const connection = await mysql.createConnection(connectionString);
    const [rows] = await connection.execute(query);
    await connection.end();
    return rows as unknown[];
  } catch (error) {
    throw new Error(`MySQL Error: ${error}`);
  }
}

// Salesforce Connector
export async function readSalesforce(
  instanceUrl: string,
  accessToken: string,
  query: string
): Promise<unknown[]> {
  try {
    const response = await fetch(`${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error(`Salesforce Error: ${response.statusText}`);
    const data = await response.json() as { records: unknown[] };
    return data.records;
  } catch (error) {
    throw new Error(`Salesforce Error: ${error}`);
  }
}

// SAP Connector
export async function readSAP(
  baseUrl: string,
  username: string,
  password: string,
  endpoint: string
): Promise<unknown[]> {
  try {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error(`SAP Error: ${response.statusText}`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.d?.results || [];
  } catch (error) {
    throw new Error(`SAP Error: ${error}`);
  }
}

// VTEX Connector
export async function readVTEX(
  accountName: string,
  apiKey: string,
  apiToken: string,
  endpoint: string
): Promise<unknown[]> {
  try {
    const response = await fetch(`https://${accountName}.vtexcommercestable.com.br/api/catalog_system/pvt/${endpoint}`, {
      headers: {
        "X-VTEX-API-AppKey": apiKey,
        "X-VTEX-API-AppToken": apiToken,
      },
    });
    if (!response.ok) throw new Error(`VTEX Error: ${response.statusText}`);
    return await response.json() as unknown[];
  } catch (error) {
    throw new Error(`VTEX Error: ${error}`);
  }
}

// ETL: Transform data
export function transformData(
  records: unknown[],
  mappings: Record<string, string>
): unknown[] {
  return records.map((record: unknown) => {
    if (typeof record !== "object" || record === null) return record;
    const transformed: Record<string, unknown> = {};
    const rec = record as Record<string, unknown>;
    for (const [source, target] of Object.entries(mappings)) {
      if (source in rec) {
        transformed[target] = rec[source];
      }
    }
    return transformed;
  });
}

// Validation
export function validateRecords(
  records: unknown[],
  schema: Record<string, "string" | "number" | "boolean" | "date">
): { valid: unknown[]; invalid: Array<{ record: unknown; errors: string[] }> } {
  const valid: unknown[] = [];
  const invalid: Array<{ record: unknown; errors: string[] }> = [];

  for (const record of records) {
    const errors: string[] = [];
    if (typeof record !== "object" || record === null) {
      valid.push(record);
      continue;
    }

    const rec = record as Record<string, unknown>;
    for (const [field, type] of Object.entries(schema)) {
      const value = rec[field];

      if (value === null || value === undefined) {
        errors.push(`${field} is required`);
        continue;
      }

      switch (type) {
        case "string":
          if (typeof value !== "string") errors.push(`${field} must be string`);
          break;
        case "number":
          if (typeof value !== "number") errors.push(`${field} must be number`);
          break;
        case "boolean":
          if (typeof value !== "boolean") errors.push(`${field} must be boolean`);
          break;
        case "date":
          if (!(value instanceof Date) && isNaN(Date.parse(String(value)))) {
            errors.push(`${field} must be valid date`);
          }
          break;
      }
    }

    if (errors.length > 0) {
      invalid.push({ record, errors });
    } else {
      valid.push(record);
    }
  }

  return { valid, invalid };
}

// Deduplication
export function deduplicateRecords(
  records: unknown[],
  uniqueFields: string[]
): unknown[] {
  const seen = new Set<string>();
  const deduplicated: unknown[] = [];

  for (const record of records) {
    if (typeof record !== "object" || record === null) {
      deduplicated.push(record);
      continue;
    }
    const rec = record as Record<string, unknown>;
    const key = uniqueFields.map((field) => rec[field]).join("|");

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(record);
    }
  }

  return deduplicated;
}

// Main sync function
export async function syncData(
  connector: ConnectorConfig,
  mappings: Record<string, string>,
  schema: Record<string, "string" | "number" | "boolean" | "date">,
  uniqueFields: string[]
): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let records: unknown[] = [];

  try {
    // Fetch data based on connector type
    switch (connector.type) {
      case "csv":
        records = await readCSV(connector.config.filePath as string);
        break;
      case "excel":
        records = await readExcel(connector.config.filePath as string, connector.config.sheetName as string | undefined);
        break;
      case "api":
        records = await fetchFromAPI(connector.config.url as string, connector.config.headers as Record<string, string> | undefined);
        break;
      case "postgresql":
        records = await readPostgreSQL(connector.config.connectionString as string, connector.config.query as string);
        break;
      case "mysql":
        records = await readMySQL(connector.config.connectionString as string, connector.config.query as string);
        break;
      case "salesforce":
        records = await readSalesforce(
          connector.config.instanceUrl as string,
          connector.config.accessToken as string,
          connector.config.query as string
        );
        break;
      case "sap":
        records = await readSAP(
          connector.config.baseUrl as string,
          connector.config.username as string,
          connector.config.password as string,
          connector.config.endpoint as string
        );
        break;
      case "vtex":
        records = await readVTEX(
          connector.config.accountName as string,
          connector.config.apiKey as string,
          connector.config.apiToken as string,
          connector.config.endpoint as string
        );
        break;
    }

    const recordsProcessed = records.length;

    // Transform
    records = transformData(records, mappings);

    // Validate
    const { valid, invalid } = validateRecords(records, schema);
    if (invalid.length > 0) {
      errors.push(`${invalid.length} records failed validation`);
    }

    // Deduplicate
    records = deduplicateRecords(valid, uniqueFields);

    const duration = Date.now() - startTime;

    return {
      success: errors.length === 0,
      recordsProcessed,
      recordsInserted: records.length,
      recordsUpdated: 0,
      recordsSkipped: invalid.length,
      errors,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [String(error)],
      duration,
    };
  }
}

