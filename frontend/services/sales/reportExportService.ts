import { BusinessDocument } from './financialStatementService';
import { documentGenerationService } from './documentGenerationService';

export const reportExportService = {
  /**
   * Export to PDF. Future versions will support format='DOCX'|'EXCEL'
   */
  async exportDocument(docRecord: BusinessDocument, format: string = 'PDF') {
    if (format === 'PDF') {
      const pdf = await documentGenerationService.generatePDF(docRecord);
      
      // Clean up filename (replace spaces and slashes)
      const cleanName = docRecord.document_name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${cleanName}_${docRecord.date_range.replace(/\s/g, '_')}.pdf`;
      
      pdf.save(filename);
    } else {
      throw new Error(`Export format ${format} is not supported yet.`);
    }
  },

  /**
   * Open the PDF in a new browser tab for previewing
   */
  async previewDocument(docRecord: BusinessDocument) {
    if (docRecord.format === 'PDF' || !docRecord.format) {
      const pdf = await documentGenerationService.generatePDF(docRecord);
      const pdfBlobUrl = pdf.output('bloburl');
      window.open(pdfBlobUrl, '_blank');
    } else {
      throw new Error(`Preview for format ${docRecord.format} is not supported yet.`);
    }
  }
};
