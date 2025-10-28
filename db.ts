import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, empresas, InsertEmpresa, diagnosticos, InsertDiagnostico, pesquisas, InsertPesquisa, respostasPesquisas, InsertRespostaPesquisa, fontesDados, InsertFonteDados, baseConhecimento, InsertBaseConhecimento, insightsIA, InsertInsightIA, acoesInteligentes, InsertAcaoInteligente, resultadosAcoes, InsertResultadoAcao, companyProfile, InsertCompanyProfile, companyProfileVersions, InsertCompanyProfileVersion, profileAuditLog, InsertProfileAuditLog, taxonomySectors, fieldPermissions, InsertFieldPermission, executiveSummaries, InsertExecutiveSummary, benchmarkData, benchmarkComparisons, InsertBenchmarkComparison, dataCopiloConversations, InsertDataCopiloConversation, profileWebhooks, InsertProfileWebhook, dataSources, InsertDataSource, syncLogs, InsertSyncLog, dataQualityScores, InsertDataQualityScore, fieldMappings, InsertFieldMapping, syncSchedules, InsertSyncSchedule, dataSourceWebhooks, InsertDataSourceWebhook, dataSourceAuditLog, InsertDataSourceAuditLog, insights, InsertInsight, insightSegments, insightActions, insightResults, insightAudit } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Helpers para Empresas
export async function createEmpresa(empresa: InsertEmpresa) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(empresas).values(empresa);
  const insertId = Number(result[0].insertId);
  
  // Buscar a empresa recém-criada para retornar o objeto completo
  const novaEmpresa = await getEmpresaById(insertId);
  if (!novaEmpresa) {
    throw new Error("Erro ao criar empresa");
  }
  
  return novaEmpresa;
}

export async function getEmpresaByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(empresas).where(eq(empresas.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEmpresaById(id: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(empresas).where(eq(empresas.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateEmpresa(id: number, data: Partial<InsertEmpresa>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(empresas).set(data).where(eq(empresas.id, id));
}

export async function getAllEmpresas() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(empresas);
}

// Helpers para Diagnósticos
export async function createDiagnostico(diagnostico: InsertDiagnostico) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(diagnosticos).values(diagnostico);
  return result[0].insertId;
}

export async function getDiagnosticoById(id: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(diagnosticos).where(eq(diagnosticos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDiagnosticosByEmpresaId(empresaId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(diagnosticos).where(eq(diagnosticos.empresaId, empresaId));
}

export async function getAllDiagnosticos() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(diagnosticos);
}

// Helpers para Pesquisas
export async function createPesquisa(pesquisa: InsertPesquisa) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(pesquisas).values(pesquisa);
  const insertId = Number(result[0].insertId);
  
  const novaPesquisa = await getPesquisaById(insertId);
  if (!novaPesquisa) {
    throw new Error("Erro ao criar pesquisa");
  }
  
  return novaPesquisa;
}

export async function getPesquisaById(id: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(pesquisas).where(eq(pesquisas.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPesquisaByLink(linkPublico: string) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(pesquisas).where(eq(pesquisas.linkPublico, linkPublico)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPesquisasByEmpresaId(empresaId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(pesquisas).where(eq(pesquisas.empresaId, empresaId));
}

export async function updatePesquisa(id: number, data: Partial<InsertPesquisa>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(pesquisas).set(data).where(eq(pesquisas.id, id));
}

// Helpers para Respostas de Pesquisas
export async function createRespostaPesquisa(resposta: InsertRespostaPesquisa) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(respostasPesquisas).values(resposta);
  return Number(result[0].insertId);
}

export async function getRespostasByPesquisaId(pesquisaId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(respostasPesquisas).where(eq(respostasPesquisas.pesquisaId, pesquisaId));
}



// Helpers para Fontes de Dados
export async function createFonteDados(fonte: InsertFonteDados) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(fontesDados).values(fonte);
  return Number(result[0].insertId);
}

export async function getFontesDadosByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(fontesDados).where(eq(fontesDados.empresaId, empresaId));
}

export async function getFonteDadosById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(fontesDados).where(eq(fontesDados.id, id));
  return result.length > 0 ? result[0] : undefined;
}

export async function updateFonteDados(id: number, data: Partial<InsertFonteDados>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(fontesDados).set(data).where(eq(fontesDados.id, id));
}

export async function deleteFonteDados(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(fontesDados).where(eq(fontesDados.id, id));
}




// Helpers para Base de Conhecimento
export async function getBaseConhecimentoByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(baseConhecimento).where(eq(baseConhecimento.empresaId, empresaId));
  return result.length > 0 ? result[0] : null;
}

export async function createOrUpdateBaseConhecimento(empresaId: number, data: Partial<InsertBaseConhecimento>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getBaseConhecimentoByEmpresa(empresaId);

  if (existing) {
    await db.update(baseConhecimento).set(data).where(eq(baseConhecimento.empresaId, empresaId));
    return existing.id;
  } else {
    const result = await db.insert(baseConhecimento).values({ ...data, empresaId });
    return Number(result[0].insertId);
  }
}

// Helpers para Insights IA
export async function createInsightIA(insight: InsertInsightIA) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(insightsIA).values(insight);
  return Number(result[0].insertId);
}

export async function getInsightsByEmpresa(empresaId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(insightsIA).where(eq(insightsIA.empresaId, empresaId));
}




// ============= AÇÕES INTELIGENTES =============

export async function createAcaoInteligente(acao: InsertAcaoInteligente) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(acoesInteligentes).values(acao);
  return Number(result[0].insertId);
}

export async function getAcoesInteligentes(empresaId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(acoesInteligentes).where(eq(acoesInteligentes.empresaId, empresaId));
}

export async function getAcaoInteligente(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(acoesInteligentes).where(eq(acoesInteligentes.id, id));
  return result[0] || null;
}

export async function updateAcaoInteligente(id: number, updates: Partial<InsertAcaoInteligente>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(acoesInteligentes).set(updates).where(eq(acoesInteligentes.id, id));
}

// ============= RESULTADOS AÇÕES =============

export async function createResultadoAcao(resultado: InsertResultadoAcao) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(resultadosAcoes).values(resultado);
  return Number(result[0].insertId);
}

export async function getResultadosAcoes(empresaId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(resultadosAcoes).where(eq(resultadosAcoes.empresaId, empresaId));
}

export async function getResultadoAcao(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(resultadosAcoes).where(eq(resultadosAcoes.id, id));
  return result[0] || null;
}

export async function updateResultadoAcao(id: number, updates: Partial<InsertResultadoAcao>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(resultadosAcoes).set(updates).where(eq(resultadosAcoes.id, id));
}




// ===== Company Profile (Sprint 1 Base de Conhecimento) =====

export async function getCompanyProfile(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(companyProfile).where(eq(companyProfile.empresaId, empresaId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertCompanyProfile(data: InsertCompanyProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getCompanyProfile(data.empresaId!);
  
  if (existing) {
    await db.update(companyProfile).set(data).where(eq(companyProfile.empresaId, data.empresaId!));
    return existing.id;
  } else {
    const result = await db.insert(companyProfile).values(data);
    return Number(result[0].insertId);
  }
}

export async function saveProfileVersion(empresaId: number, payload: any, status: string, publishedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const profile = await getCompanyProfile(empresaId);
  const versao = profile?.versao || 1;
  
  await db.insert(companyProfileVersions).values({
    empresaId,
    versao,
    payload,
    status,
    publishedBy,
    publishedAt: status === "publicado" ? new Date() : undefined,
  });
}

export async function publishCompanyProfile(empresaId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const profile = await getCompanyProfile(empresaId);
  if (!profile) throw new Error("Profile not found");
  
  // Salvar versão publicada
  await saveProfileVersion(empresaId, profile, "publicado", userId);
  
  // Atualizar status e data de publicação
  await db.update(companyProfile)
    .set({
      status: "publicado",
      versao: (profile.versao || 1) + 1,
      publishedAt: new Date(),
    })
    .where(eq(companyProfile.empresaId, empresaId));
}

export async function logProfileChange(empresaId: number, fieldPath: string, oldValue: any, newValue: any, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(profileAuditLog).values({
    empresaId,
    userId,
    fieldPath,
    oldValue: JSON.stringify(oldValue),
    newValue: JSON.stringify(newValue),
    action: "update",
  });
}

export async function getTaxonomySectorByKeywords(keywords: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const sectors = await db.select().from(taxonomySectors);
  
  for (const sector of sectors) {
    const sectorKeywords = (sector.keywords as string[]) || [];
    for (const keyword of keywords) {
      if (sectorKeywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))) {
        return sector;
      }
    }
  }
  
  return null;
}

export async function calculateDataQualityScore(empresaId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const profile = await getCompanyProfile(empresaId);
  if (!profile) return 0;
  
  let score = 0;
  let totalFields = 0;
  
  // Verificar completude de campos
  const fields = [
    profile.missao,
    profile.visao,
    profile.valores,
    profile.publicoAlvo,
    profile.personas,
    profile.segmentos,
    profile.erpsUtilizados,
    profile.fontesConectadas,
    profile.metasTrimestrais,
  ];
  
  fields.forEach(field => {
    totalFields++;
    if (field) score += 1;
  });
  
  // Calcular score percentual (0-100)
  return Math.round((score / totalFields) * 100);
}




// ===== Sprint 2: Field Permissions & Executive Summary =====

export async function setFieldPermission(data: InsertFieldPermission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(fieldPermissions)
    .where(and(
      eq(fieldPermissions.empresaId, data.empresaId!),
      eq(fieldPermissions.fieldPath, data.fieldPath!),
      eq(fieldPermissions.role, data.role!)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(fieldPermissions).set(data).where(eq(fieldPermissions.id, existing[0].id));
  } else {
    await db.insert(fieldPermissions).values(data);
  }
}

export async function getFieldPermissions(empresaId: number, fieldPath: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(fieldPermissions)
    .where(and(
      eq(fieldPermissions.empresaId, empresaId),
      eq(fieldPermissions.fieldPath, fieldPath)
    ));
}

export async function saveExecutiveSummary(data: InsertExecutiveSummary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(executiveSummaries).values(data);
  return Number(result[0].insertId);
}

export async function getExecutiveSummary(empresaId: number, versao?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const whereConditions = versao
    ? and(
        eq(executiveSummaries.empresaId, empresaId),
        eq(executiveSummaries.versao, versao)
      )
    : eq(executiveSummaries.empresaId, empresaId);
  
  const result = await db.select().from(executiveSummaries)
    .where(whereConditions)
    .orderBy(executiveSummaries.versao)
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

// ===== Sprint 3: Benchmarks & Copilot =====

export async function getBenchmarkData(setor: string, porte: string, metricaChave: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(benchmarkData)
    .where(and(
      eq(benchmarkData.setor, setor),
      eq(benchmarkData.porte, porte),
      eq(benchmarkData.metricaChave, metricaChave)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function saveBenchmarkComparison(data: InsertBenchmarkComparison) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(benchmarkComparisons).values(data);
  return Number(result[0].insertId);
}

export async function getBenchmarkComparisons(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(benchmarkComparisons)
    .where(eq(benchmarkComparisons.empresaId, empresaId));
}

export async function saveDataCopiloConversation(data: InsertDataCopiloConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(dataCopiloConversations).values(data);
  return Number(result[0].insertId);
}

export async function getDataCopiloHistory(empresaId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(dataCopiloConversations)
    .where(eq(dataCopiloConversations.empresaId, empresaId))
    .orderBy(dataCopiloConversations.criadoEm)
    .limit(limit);
}

export async function saveProfileWebhook(data: InsertProfileWebhook) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(profileWebhooks).values(data);
  return Number(result[0].insertId);
}

export async function getPendingWebhooks() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(profileWebhooks)
    .where(eq(profileWebhooks.status, "pendente"));
}

export async function updateWebhookStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(profileWebhooks)
    .set({ status: status as any })
    .where(eq(profileWebhooks.id, id));
}




/**
 * Sprint A-C: Meus Dados - Data Sources Management
 */

export async function getDataSources(empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(dataSources)
    .where(eq(dataSources.empresaId, empresaId))
    .orderBy(desc(dataSources.createdAt));
}

export async function getDataSourceById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .then((rows) => rows[0]);
}

export async function createDataSource(data: InsertDataSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(dataSources).values(data);
  return result;
}

export async function updateDataSource(id: number, data: Partial<InsertDataSource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .update(dataSources)
    .set(data)
    .where(eq(dataSources.id, id));
}

export async function deleteDataSource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .delete(dataSources)
    .where(eq(dataSources.id, id));
}

// Sync Logs
export async function getSyncLogs(dataSourceId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.dataSourceId, dataSourceId))
    .orderBy(desc(syncLogs.criadoEm))
    .limit(limit);
}

export async function createSyncLog(data: InsertSyncLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(syncLogs).values(data);
}

// Data Quality Scores
export async function getDataQualityScore(dataSourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(dataQualityScores)
    .where(eq(dataQualityScores.dataSourceId, dataSourceId))
    .orderBy(desc(dataQualityScores.criadoEm))
    .then((rows) => rows[0]);
}

export async function saveDataQualityScore(data: InsertDataQualityScore) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(dataQualityScores).values(data);
}

// Field Mappings
export async function getFieldMappings(dataSourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(fieldMappings)
    .where(eq(fieldMappings.dataSourceId, dataSourceId));
}

export async function saveFieldMappings(dataSourceId: number, mappings: InsertFieldMapping[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(fieldMappings)
    .where(eq(fieldMappings.dataSourceId, dataSourceId));
  
  return db.insert(fieldMappings).values(mappings);
}

// Sync Schedules
export async function getSyncSchedule(dataSourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(syncSchedules)
    .where(eq(syncSchedules.dataSourceId, dataSourceId))
    .then((rows) => rows[0]);
}

export async function saveSyncSchedule(data: InsertSyncSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSyncSchedule(data.dataSourceId);
  if (existing) {
    return db
      .update(syncSchedules)
      .set(data)
      .where(eq(syncSchedules.dataSourceId, data.dataSourceId));
  }
  return db.insert(syncSchedules).values(data);
}

// Webhooks
export async function getWebhookByDataSource(dataSourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(dataSourceWebhooks)
    .where(eq(dataSourceWebhooks.dataSourceId, dataSourceId))
    .then((rows) => rows[0]);
}

export async function saveDataSourceWebhook(data: InsertDataSourceWebhook) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getWebhookByDataSource(data.dataSourceId);
  if (existing) {
    return db
      .update(dataSourceWebhooks)
      .set(data)
      .where(eq(dataSourceWebhooks.dataSourceId, data.dataSourceId));
  }
  return db.insert(dataSourceWebhooks).values(data);
}

// Audit Log
export async function createDataSourceAuditLog(data: InsertDataSourceAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(dataSourceAuditLog).values(data);
}

export async function getDataSourceAuditLog(dataSourceId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db
    .select()
    .from(dataSourceAuditLog)
    .where(eq(dataSourceAuditLog.dataSourceId, dataSourceId))
    .orderBy(desc(dataSourceAuditLog.criadoEm))
    .limit(limit);
}




/**
 * Análise da IA - Insights
 */
export async function getInsights(empresaId: number, filtros?: { familia?: string; estado?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(insights.empresaId, empresaId)];
  
  if (filtros?.familia) {
    conditions.push(eq(insights.familia, filtros.familia));
  }
  if (filtros?.estado) {
    conditions.push(eq(insights.estado, filtros.estado));
  }
  
  return db.select().from(insights).where(and(...conditions)).orderBy(desc(insights.priorityScore)).limit(filtros?.limit || 50);
}

export async function getInsightById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(insights).where(eq(insights.id, id));
  return result[0] || null;
}

export async function createInsight(data: InsertInsight) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(insights).values(data);
  return result;
}

export async function updateInsightEstado(id: number, estado: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(insights).set({ estado }).where(eq(insights.id, id));
}

export async function createInsightAction(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(insightActions).values(data);
}

export async function getInsightActions(insightId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(insightActions).where(eq(insightActions.insightId, insightId));
}

export async function createInsightResult(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(insightResults).values(data);
}

export async function getInsightResults(insightId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(insightResults).where(eq(insightResults.insightId, insightId));
}

export async function createInsightAuditLog(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(insightAudit).values(data);
}

export async function getInsightAuditLog(insightId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(insightAudit).where(eq(insightAudit.insightId, insightId)).orderBy(desc(insightAudit.quando));
}

