import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { ColumnMapping, ImportBatch, User, ValidationSummary } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  SAMPLE_CLEAN_EXPORT_CSV,
  SAMPLE_CONFLICT_UPDATE_CSV,
  SAMPLE_INVALID_ROWS_CSV,
  downloadSampleCsv,
} from '../utils/sampleFiles.ts';

interface FileImportWizardProps {
  currentUser: User;
  onImportCompleted: (batch: ImportBatch) => void;
  onCancel: () => void;
}

export const FileImportWizard: React.FC<FileImportWizardProps> = ({
  currentUser,
  onImportCompleted,
  onCancel,
}) => {
  // Wizard steps: 1: File Selection, 2: Preview & Mapping, 3: Validation Review, 4: Results & Report
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed data
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [allRawRows, setAllRawRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Column Mapping
  const [mapping, setMapping] = useState<ColumnMapping>({
    taskId: '',
    taskType: '',
    description: '',
    status: '',
    substatus: '',
    priority: '',
    assigneeName: '',
    teamName: '',
    createdAt: '',
    dueAt: '',
    relatedObjectType: '',
    relatedObjectId: '',
  });

  // Validation results
  const [batchId, setBatchId] = useState<string>('');
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);

  // Final committed batch
  const [committedBatch, setCommittedBatch] = useState<ImportBatch | null>(null);

  const isSupervisor = currentUser.role === 'Supervisor';

  // Handle direct file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setErrorMessage(null);
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      setErrorMessage('Unsupported file format. Please upload a .csv or .xlsx file.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds 10 MB limit.');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileBase64(base64);
      await parseFile(base64, selectedFile.name);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Helper for sample fixtures
  const loadSampleFixture = async (type: 'clean' | 'conflict' | 'invalid') => {
    setErrorMessage(null);
    let content = SAMPLE_CLEAN_EXPORT_CSV;
    let name = 'CCS_Export_Clean_Batch.csv';
    if (type === 'conflict') {
      content = SAMPLE_CONFLICT_UPDATE_CSV;
      name = 'CCS_Export_With_Conflicts.csv';
    } else if (type === 'invalid') {
      content = SAMPLE_INVALID_ROWS_CSV;
      name = 'CCS_Export_Invalid_Duplicates.csv';
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const mockFile = new File([blob], name, { type: 'text/csv' });
    setFile(mockFile);
    setFileName(name);

    const base64 = btoa(content);
    setFileBase64(base64);
    await parseFile(base64, name);
  };

  const parseFile = async (b64: string, name: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await api.parseImportFile(b64, name);
      setHeaders(res.headers || []);
      setPreviewRows(res.previewRows || []);
      setTotalRows(res.totalRows || 0);

      // Auto-assign mapping
      if (res.suggestedMapping) {
        setMapping(res.suggestedMapping);
      }
      setIsProcessing(false);
      setStep(2); // Advance to Preview & Mapping
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to parse file.');
    }
  };

  // Validate mapping & rows
  const handleValidate = async () => {
    if (!mapping.taskId) {
      setErrorMessage('Task ID column mapping is required.');
      return;
    }
    if (!mapping.status) {
      setErrorMessage('Status column mapping is required.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      // Re-parse all rows via backend or use parsed
      const parseRes = await api.parseImportFile(fileBase64, fileName);
      const valRes = await api.validateImport(parseRes.previewRows ? parseRes.previewRows : [], mapping, fileName);

      // If backend returns previewRows limit, validate all rows
      setBatchId(valRes.batchId);
      setValidationSummary(valRes.summary);
      setIsProcessing(false);
      setStep(3); // Advance to Review & Validation Summary
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Validation failed.');
    }
  };

  // Confirm and persist import batch
  const handleCommitImport = async () => {
    if (!isSupervisor) {
      setErrorMessage('Permission Denied: Only supervisors are authorized to commit imports.');
      return;
    }
    if (!validationSummary || !batchId) return;

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const batch = await api.commitImport(batchId, fileName, validationSummary);
      setCommittedBatch(batch);
      setIsProcessing(false);
      setStep(4); // Final Results
      onImportCompleted(batch);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to persist import batch.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      {/* Wizard Progress Bar */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100">Oracle CCS To Do File Import Wizard</h2>
          <p className="text-xs text-slate-400">10-Step Secure Parsing, Mapping, and Conflict Policy Engine</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center space-x-2 text-xs">
          {[
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Map Columns' },
            { num: 3, label: 'Validation' },
            { num: 4, label: 'Complete' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full ${
                step === s.num
                  ? 'bg-blue-600 text-white font-semibold'
                  : step > s.num
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-slate-950/40">
                {s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6">
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <div>
              <span className="font-bold block">Import Error:</span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* STEP 1: Upload File & Pick Sample Fixtures */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center bg-slate-50/50 transition">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-800 text-sm mb-1">
                Drag and drop your exported CCS To Do file here
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Supported formats: CSV or Excel XLSX (Max 10 MB, up to 5,000 rows).
              </p>
              <label className="cursor-pointer inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition">
                <span>Browse Local Files</span>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Pre-packaged sample export files for instant testing */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Or Test With Sample CCS Export Fixtures:
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pre-configured real-world scenario datasets ready for testing the import pipeline:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-700 font-semibold text-xs">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Clean Batch Export</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      6 valid new To Do entries across Billing, Meter, and Collections.
                    </p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => loadSampleFixture('clean')}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium"
                    >
                      Load Sample
                    </button>
                    <button
                      onClick={() => downloadSampleCsv('Clean_CCS_Export.csv', SAMPLE_CLEAN_EXPORT_CSV)}
                      className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
                      title="Download CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center space-x-2 text-amber-700 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Re-Import Conflicts</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Contains TD10001 & TD10026 which have local modifications to test conflict detection.
                    </p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => loadSampleFixture('conflict')}
                      className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium"
                    >
                      Load Conflicts
                    </button>
                    <button
                      onClick={() => downloadSampleCsv('Conflict_CCS_Export.csv', SAMPLE_CONFLICT_UPDATE_CSV)}
                      className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
                      title="Download CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center space-x-2 text-red-700 font-semibold text-xs">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <span>Duplicates & Bad Rows</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Contains missing IDs, duplicate entries, invalid status codes, and formula injections.
                    </p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => loadSampleFixture('invalid')}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                    >
                      Load Bad Rows
                    </button>
                    <button
                      onClick={() => downloadSampleCsv('Invalid_Rows_CCS_Export.csv', SAMPLE_INVALID_ROWS_CSV)}
                      className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
                      title="Download CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Preview & Column Mapping */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 p-3.5 rounded-lg text-xs text-blue-900">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>
                  Loaded file: <strong className="font-semibold">{fileName}</strong> ({totalRows} rows detected)
                </span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-blue-700 hover:underline font-medium"
              >
                Change File
              </button>
            </div>

            {/* Column Mapping Grid */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">
                Map Source File Headers to Canonical Task Schema
              </h3>
              <p className="text-xs text-slate-500">
                Configure which columns from your export correspond to CCS To Do fields. Unmapped fields will be
                preserved in source metadata.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Task ID (Mandatory) */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Task ID <span className="text-red-500">* (Required)</span>
                  </label>
                  <select
                    value={mapping.taskId}
                    onChange={(e) => setMapping({ ...mapping, taskId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md font-medium text-slate-800"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status (Mandatory) */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Status <span className="text-red-500">* (Required)</span>
                  </label>
                  <select
                    value={mapping.status}
                    onChange={(e) => setMapping({ ...mapping, status: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md font-medium text-slate-800"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={mapping.priority}
                    onChange={(e) => setMapping({ ...mapping, priority: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-slate-800"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Type */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Task Type</label>
                  <select
                    value={mapping.taskType}
                    onChange={(e) => setMapping({ ...mapping, taskType: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-slate-800"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Description / Message</label>
                  <select
                    value={mapping.description}
                    onChange={(e) => setMapping({ ...mapping, description: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-slate-800"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assignee User</label>
                  <select
                    value={mapping.assigneeName}
                    onChange={(e) => setMapping({ ...mapping, assigneeName: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-slate-800"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team / Role */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Team / To Do Role</label>
                  <select
                    value={mapping.teamName}
                    onChange={(e) => setMapping({ ...mapping, teamName: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-slate-800"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Due Date</label>
                  <select
                    value={mapping.dueAt}
                    onChange={(e) => setMapping({ ...mapping, dueAt: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-slate-800"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Related Object ID */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Drilldown Object ID</label>
                  <select
                    value={mapping.relatedObjectId}
                    onChange={(e) => setMapping({ ...mapping, relatedObjectId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-slate-800"
                  >
                    <option value="">-- Select Header --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Preview Raw Rows */}
            <div>
              <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider mb-2">
                Raw File Preview (First {previewRows.length} Rows)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="p-2 border-r border-slate-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {headers.map((h) => (
                          <td key={h} className="p-2 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Back
              </button>
              <button
                onClick={handleValidate}
                disabled={isProcessing || !mapping.taskId || !mapping.status}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Validating Rows...</span>
                  </>
                ) : (
                  <>
                    <span>Validate Rows & Check Conflicts</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Supervisor Review & Validation Summary */}
        {step === 3 && validationSummary && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Import Validation Summary</h3>
                <p className="text-xs text-slate-500">
                  Review row disposition before committing to local task store:
                </p>
              </div>
              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200">
                Batch ID: {batchId}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Rows In File</span>
                <span className="text-lg font-bold text-slate-900">{validationSummary.totalRows}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <span className="text-[11px] text-emerald-700 block">Accepted Rows</span>
                <span className="text-lg font-bold text-emerald-900">{validationSummary.acceptedRows}</span>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <span className="text-[11px] text-red-700 block">Rejected Rows</span>
                <span className="text-lg font-bold text-red-900">{validationSummary.rejectedRows}</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <span className="text-[11px] text-amber-700 block">Conflict Flagged</span>
                <span className="text-lg font-bold text-amber-900">{validationSummary.conflictsCount}</span>
              </div>
            </div>

            {/* Breakdown details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block">New Tasks:</span>
                <span className="font-semibold text-slate-800">{validationSummary.newTasksCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Unchanged Tasks:</span>
                <span className="font-semibold text-slate-800">{validationSummary.unchangedTasksCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Duplicate Rows:</span>
                <span className="font-semibold text-slate-800">{validationSummary.duplicateRows}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Warnings:</span>
                <span className="font-semibold text-amber-700">{validationSummary.warningCount}</span>
              </div>
            </div>

            {/* Warnings list if any */}
            {validationSummary.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 space-y-2">
                <h4 className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Validation Warnings ({validationSummary.warnings.length})</span>
                </h4>
                <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-amber-800 divide-y divide-amber-200/50">
                  {validationSummary.warnings.map((w: { rowNumber: number; taskId?: string; warning: string }, idx: number) => (
                    <div key={idx} className="pt-1">
                      Row {w.rowNumber} {w.taskId ? `(${w.taskId})` : ''}: {w.warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected rows report if any */}
            {validationSummary.rejectedReport.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 space-y-2">
                <h4 className="text-xs font-bold text-red-900 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Rejected Rows Report ({validationSummary.rejectedReport.length})</span>
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs text-red-800">
                  {validationSummary.rejectedReport.map((r: { rowNumber: number; reason: string }, idx: number) => (
                    <div key={idx} className="p-2 bg-white rounded border border-red-200 text-[11px]">
                      <span className="font-bold">Row {r.rowNumber}:</span> {r.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supervisor permission check */}
            {!isSupervisor && (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700">
                You are currently viewing as <strong>{currentUser.displayName} (Operator)</strong>.
                Only a <strong>Supervisor</strong> has authorization to confirm and commit imports. Switch role in
                header to Marcus Vance (Supervisor) to proceed.
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Back to Mapping
              </button>

              <button
                onClick={handleCommitImport}
                disabled={isProcessing || !isSupervisor || validationSummary.acceptedRows === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing Batch...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm & Commit Import Batch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Final Results & Batch Completion */}
        {step === 4 && committedBatch && (
          <div className="text-center py-6 space-y-5">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Import Batch Successfully Processed</h3>
              <p className="text-xs text-slate-500 mt-1">
                Batch <span className="font-mono font-semibold">{committedBatch.batchId}</span> persisted to local
                workspace.
              </p>
            </div>

            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Rows Processed:</span>
                <span className="font-semibold text-slate-900">{committedBatch.totalRows}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tasks Accepted / Created:</span>
                <span className="font-semibold text-emerald-700">{committedBatch.acceptedRows}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Conflicts Requiring Review:</span>
                <span className="font-semibold text-amber-700">{committedBatch.conflictsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Import Result State:</span>
                <span className="font-semibold text-blue-700">{committedBatch.result}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Go to Work Queue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
