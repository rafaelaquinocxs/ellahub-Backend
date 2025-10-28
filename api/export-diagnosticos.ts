import { Request, Response } from 'express';
import * as db from '../db';

/**
 * API para exportar dados de diagnósticos
 * Endpoint: GET /api/export-diagnosticos
 * 
 * Query params:
 * - format: 'json' | 'csv' (default: 'json')
 * - empresaId: number (opcional - filtrar por empresa)
 * - startDate: string (opcional - data início no formato YYYY-MM-DD)
 * - endDate: string (opcional - data fim no formato YYYY-MM-DD)
 */
export async function exportDiagnosticos(req: Request, res: Response) {
  try {
    const { format = 'json', empresaId, startDate, endDate } = req.query;

    // Buscar todos os diagnósticos
    let diagnosticos = await db.getAllDiagnosticos();

    // Aplicar filtros se fornecidos
    if (empresaId) {
      const empresaIdNum = parseInt(empresaId as string);
      diagnosticos = diagnosticos.filter(d => d.empresaId === empresaIdNum);
    }

    if (startDate) {
      const start = new Date(startDate as string);
      diagnosticos = diagnosticos.filter(d => new Date(d.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      diagnosticos = diagnosticos.filter(d => new Date(d.createdAt) <= end);
    }

    // Buscar dados das empresas
    const empresas = await db.getAllEmpresas();
    const empresasMap = new Map(empresas.map(e => [e.id, e]));

    // Enriquecer dados com informações das empresas
    const dadosEnriquecidos = diagnosticos.map(d => {
      const empresa = empresasMap.get(d.empresaId);
      
      return {
        diagnosticoId: d.id,
        empresaId: d.empresaId,
        nomeEmpresa: empresa?.nome || `Empresa #${d.empresaId}`,
        emailEmpresa: empresa?.email,
        telefoneEmpresa: empresa?.telefone,
        clientesAtivos: empresa?.clientesAtivos,
        clientesInativos: empresa?.clientesInativos,
        investimentoMarketing: empresa?.investimentoMarketing,
        ticketMedio: empresa?.ticketMedio,
        taxaRecompra: empresa?.taxaRecompra,
        scoreGeral: d.scoreGeral,
        scoreGovernanca: d.scoreGovernanca,
        scoreIntegracao: d.scoreIntegracao,
        scoreAnalitica: d.scoreAnalitica,
        scoreDecisao: d.scoreDecisao,
        scoreRoi: d.scoreRoi,
        desperdicioMensal: d.desperdicioMensal,
        potencialMensal: d.potencialMensal,
        impactoAnual: d.impactoAnual,
        nivelMaturidade: getNivelMaturidade(d.scoreGeral),
        dataDiagnostico: d.createdAt,
        respostas: d.respostas,
      };
    });

    // Retornar no formato solicitado
    if (format === 'csv') {
      const csv = convertToCSV(dadosEnriquecidos);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="diagnosticos_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        total: dadosEnriquecidos.length,
        data: dadosEnriquecidos,
        metadata: {
          exportedAt: new Date().toISOString(),
          filters: {
            empresaId: empresaId || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
        },
      });
    }
  } catch (error) {
    console.error('Erro ao exportar diagnósticos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao exportar diagnósticos',
    });
  }
}

function getNivelMaturidade(score: number): string {
  if (score >= 80) return 'Avançado';
  if (score >= 60) return 'Intermediário';
  if (score >= 40) return 'Básico';
  return 'Inicial';
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  // Cabeçalhos (excluir o campo 'respostas' que é JSON)
  const headers = Object.keys(data[0]).filter(key => key !== 'respostas');
  
  // Linhas de dados
  const rows = data.map(item => 
    headers.map(header => {
      const value = item[header];
      // Escapar valores que contêm vírgulas ou aspas
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

