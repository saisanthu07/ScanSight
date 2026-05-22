import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, FileText, AlertTriangle, CheckCircle2, User, Calendar, Activity, Microscope } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

const SEV_COLOR = {
  normal: '#10b981', mild: '#f59e0b', moderate: '#f97316', severe: '#ef4444', critical: '#dc2626',
};

export default function ReportModal({ open, onClose, report }) {
  const printRef = useRef(null);

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(5, 12, 26);
    doc.rect(0, 0, pageW, 40, 'F');
    doc.setTextColor(6, 182, 212);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ScanSight', 20, 18);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('MEDICAL AI IMAGING REPORT', 20, 26);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`Report ID: ${report.reportId}`, pageW - 20, 18, { align: 'right' });
    doc.text(`Date: ${report.reportDate}`, pageW - 20, 26, { align: 'right' });

    y = 55;
    doc.setTextColor(30, 30, 30);

    // Patient & Physician
    doc.setFillColor(240, 248, 255);
    doc.rect(15, y - 5, pageW - 30, 36, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 80, 120);
    doc.text('PATIENT INFORMATION', 20, y + 2);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(`Name: ${report.patient.name}`, 20, y + 2);
    doc.text(`ID: ${report.patient.patientId}`, pageW / 2, y + 2);
    y += 8;
    doc.text(`Age: ${report.patient.age} years`, 20, y + 2);
    doc.text(`Gender: ${report.patient.gender}`, pageW / 2, y + 2);
    y += 8;
    doc.text(`Blood Group: ${report.patient.bloodGroup}`, 20, y + 2);
    y += 16;

    // Scan Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(6, 80, 120);
    doc.text('SCAN DETAILS', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`Type: ${report.scanDetails.scanType}  |  Body Part: ${report.scanDetails.bodyPart}  |  Priority: ${report.scanDetails.priority}  |  Contrast: ${report.scanDetails.contrastUsed}`, 20, y);
    y += 12;

    // AI Analysis
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(6, 80, 120);
    doc.text('AI ANALYSIS RESULTS', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`Overall Severity: ${report.aiAnalysis.overallSeverity?.toUpperCase()}   |   Risk: ${report.aiAnalysis.riskLevel}   |   Confidence: ${report.aiAnalysis.overallConfidence}   |   Findings: ${report.aiAnalysis.totalFindings}`, 20, y);
    y += 6;

    if (report.aiAnalysis.primaryDiagnosis) {
      doc.setFont('helvetica', 'bold');
      doc.text('Primary Diagnosis: ', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(report.aiAnalysis.primaryDiagnosis, 58, y);
      y += 6;
    }
    if (report.aiAnalysis.detectedConditions?.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Detected Conditions: ', 20, y);
      doc.setFont('helvetica', 'normal');
      const conditionsStr = report.aiAnalysis.detectedConditions.join(', ');
      const condLines = doc.splitTextToSize(conditionsStr, pageW - 62);
      doc.text(condLines, 60, y);
      y += condLines.length * 5;
    }
    y += 6;

    // Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(6, 80, 120);
    doc.text('SUMMARY', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(report.summary, pageW - 40);
    doc.text(summaryLines, 20, y);
    y += summaryLines.length * 5 + 8;

    // Findings
    if (report.keyFindings?.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(6, 80, 120);
      doc.text('KEY FINDINGS', 20, y);
      y += 6;
      report.keyFindings.forEach((f, i) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFillColor(248, 248, 248);
        doc.rect(15, y - 2, pageW - 30, 22, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        doc.text(`${i + 1}. ${f.category} — ${f.severity.toUpperCase()} (${f.confidence})`, 20, y + 4);
        doc.setFont('helvetica', 'normal');
        const findingLines = doc.splitTextToSize(f.description, pageW - 50);
        doc.text(findingLines, 20, y + 10);
        if (f.recommendation) {
          doc.setTextColor(100, 100, 200);
          doc.text(`→ ${f.recommendation}`, 20, y + 16);
          doc.setTextColor(30, 30, 30);
        }
        y += 26;
      });
    }

    // Disclaimer
    if (y > 250) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFillColor(255, 245, 235);
    const disclaimerLines = doc.splitTextToSize(report.disclaimer, pageW - 40);
    doc.rect(15, y - 3, pageW - 30, disclaimerLines.length * 4.5 + 8, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 80, 30);
    doc.text(disclaimerLines, 20, y + 3);

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`ScanSight Medical AI — ${report.reportDate} — Page ${i} of ${pageCount}`, pageW / 2, 290, { align: 'center' });
    }

    doc.save(`ScanSight_Report_${report.patient.patientId}_${report.reportId}.pdf`);
  };

  if (!report) return null;

  const urgentFindings = report.keyFindings?.filter(f => ['severe', 'critical'].includes(f.severity)) || [];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            className="relative glass rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/10 flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <h2 className="text-base font-semibold text-white">Medical Imaging Report</h2>
                  <p className="text-xs text-slate-500">ID: {report.reportId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDownloadPDF} className="btn-primary text-xs py-2">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Report Body */}
            <div ref={printRef} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Urgent Alert */}
              {urgentFindings.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-300">⚠️ {urgentFindings.length} Urgent Finding{urgentFindings.length > 1 ? 's' : ''} Require Immediate Attention</p>
                    <p className="text-xs text-red-400/80 mt-0.5">Please review critical findings and initiate appropriate clinical response.</p>
                  </div>
                </div>
              )}

              {/* Header info row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoBox icon={User} label="Patient" value={report.patient.name} sub={report.patient.patientId} />
                <InfoBox icon={Calendar} label="Report Date" value={report.reportDate} sub={report.reportTime} />
                <InfoBox icon={Activity} label="Scan" value={`${report.scanDetails.scanType} — ${report.scanDetails.bodyPart}`} sub={`Priority: ${report.scanDetails.priority}`} />
              </div>

              {/* Severity Banner */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between"
                style={{
                  background: `${SEV_COLOR[report.aiAnalysis.overallSeverity] || '#10b981'}15`,
                  borderColor: `${SEV_COLOR[report.aiAnalysis.overallSeverity] || '#10b981'}40`,
                }}
              >
                <div>
                  <p className="text-xs text-slate-400 mb-1">Overall Assessment</p>
                  <p className="text-lg font-bold text-white capitalize">{report.aiAnalysis.overallSeverity}</p>
                  <p className="text-xs" style={{ color: SEV_COLOR[report.aiAnalysis.overallSeverity] }}>
                    {report.aiAnalysis.riskLevel}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <p className="text-xs text-slate-500">AI Confidence</p>
                    <p className="text-base font-bold text-white">{report.aiAnalysis.overallConfidence}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Findings</p>
                    <p className="text-base font-bold text-white">{report.aiAnalysis.totalFindings}</p>
                  </div>
                </div>
              </div>

              {/* Detected Pathologies */}
              {(report.aiAnalysis.primaryDiagnosis || report.aiAnalysis.detectedConditions?.length > 0) && (
                <div className="card bg-navy-800/60 border border-white/5 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-cyan-400" /> Detected Pathologies
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.aiAnalysis.primaryDiagnosis && (
                      <div className="bg-navy-900/50 p-3 rounded-xl border border-cyan-500/10">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Primary Diagnosis</span>
                        <p className="text-sm font-bold text-cyan-400 mt-1">{report.aiAnalysis.primaryDiagnosis}</p>
                      </div>
                    )}
                    {report.aiAnalysis.detectedConditions?.length > 0 && (
                      <div className="bg-navy-900/50 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Detected Conditions</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {report.aiAnalysis.detectedConditions.map((cond, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-300 border border-white/10"
                            >
                              {cond}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="card bg-navy-800/60">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> AI Summary
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{report.summary}</p>
              </div>

              {/* Key Findings */}
              {report.keyFindings?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Key Findings</h3>
                  <div className="space-y-2">
                    {report.keyFindings.map((f) => (
                      <div
                        key={f.number}
                        className="p-4 rounded-xl border border-white/5 bg-navy-800/40"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-navy-700 flex items-center justify-center text-[10px] font-bold text-slate-400">{f.number}</span>
                            <span className="text-xs font-semibold text-white">{f.category}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] text-slate-500">{f.confidence}</span>
                            <span className={`badge text-[10px] severity-${f.severity}`}>{f.severity}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 ml-7 mb-2">{f.description}</p>
                        {f.recommendation && (
                          <div className="ml-7 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                            <p className="text-[11px] text-blue-400">→ {f.recommendation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Physician */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-500">
                <div>
                  <p className="font-medium text-slate-300">{report.physician.name}</p>
                  <p>{report.physician.specialization} · {report.physician.hospital}</p>
                  {report.physician.licenseNumber !== 'N/A' && <p>License: {report.physician.licenseNumber}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-slate-600">{report.aiAnalysis.source}</p>
                  <p className="text-[10px] text-slate-600">Analysis: {report.aiAnalysis.completedAt}</p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                <p className="text-[11px] text-orange-400/80 leading-relaxed">{report.disclaimer}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoBox({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-navy-800/60 rounded-xl p-3 border border-white/5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}
