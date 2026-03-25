import { useExportHeliOm, useExportOdoo, useExportReport } from './use-export';

interface ExportViewProps {
  sessionId: string;
  clientAddress: string;
  status: string;
}

export default function ExportView({ sessionId, clientAddress: label, status }: ExportViewProps) {
  const heliExport = useExportHeliOm(sessionId, label);
  const reportExport = useExportReport(sessionId, label);
  const odooExport = useExportOdoo(sessionId, label);

  if (status !== 'completed') return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Exports</h3>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => heliExport.mutate()}
          disabled={heliExport.isPending}
          className="w-full py-2 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {heliExport.isPending ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Genereren...
            </>
          ) : (
            'Download Heli OM Excel'
          )}
        </button>
        {heliExport.isError && (
          <p className="text-red-600 text-sm">
            {heliExport.error.message}{' '}
            <button onClick={() => heliExport.mutate()} className="underline">Opnieuw</button>
          </p>
        )}

        <button
          onClick={() => reportExport.mutate()}
          disabled={reportExport.isPending}
          className="w-full py-2 border border-blue-700 text-blue-700 font-medium rounded-md hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {reportExport.isPending ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full" />
              Genereren...
            </>
          ) : (
            'Download Klantrapport PDF'
          )}
        </button>
        {reportExport.isError && (
          <p className="text-red-600 text-sm">
            {reportExport.error.message}{' '}
            <button onClick={() => reportExport.mutate()} className="underline">Opnieuw</button>
          </p>
        )}

        <button
          onClick={() => odooExport.mutate()}
          disabled={odooExport.isPending}
          className="w-full py-2 border border-gray-800 text-gray-900 font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {odooExport.isPending ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-gray-800 border-t-transparent rounded-full" />
              Odoo CSV...
            </>
          ) : (
            'Download Odoo CSV'
          )}
        </button>
        {odooExport.isError && (
          <p className="text-red-600 text-sm">
            {odooExport.error.message}{' '}
            <button onClick={() => odooExport.mutate()} className="underline">Opnieuw</button>
          </p>
        )}
      </div>
    </div>
  );
}
