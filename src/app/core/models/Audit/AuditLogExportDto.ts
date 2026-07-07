import { AuditLogFilter } from "./AuditLogFilterDto";

export type ExportFormat = 'Excel' | 'PDF' | 'CSV';

export interface AuditLogExport {
  /** Format d'export (Excel, PDF, CSV) */
  format: ExportFormat;

  /** Filtres à appliquer pour l'export */
  filters: AuditLogFilter;

  /** Colonnes à inclure dans l'export */
  columns?: string[];

  /** Nom du fichier */
  fileName?: string;
}

// Classe utilitaire pour construire une exportation
export class AuditLogExportBuilder {
  private exportConfig: Partial<AuditLogExport> = {
    format: 'Excel',
    filters: { page: 1, pageSize: 1000 }
  };

  setFormat(format: ExportFormat): this {
    this.exportConfig.format = format;
    return this;
  }

  setFilters(filters: AuditLogFilter): this {
    this.exportConfig.filters = filters;
    return this;
  }

  setColumns(columns: string[]): this {
    this.exportConfig.columns = columns;
    return this;
  }

  setFileName(fileName: string): this {
    this.exportConfig.fileName = fileName;
    return this;
  }

  build(): AuditLogExport {
    return this.exportConfig as AuditLogExport;
  }
}
