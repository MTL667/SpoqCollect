import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  useMappingRules,
  useOdooProducts,
  useObjectTypesForAdmin,
  useCreateMappingRule,
  useUpdateMappingRule,
  useDeleteMappingRule,
  type MappingRule,
  type MappingRuleInput,
} from './use-mapping-rules';

const REGIONS = [
  { value: '', label: 'Alle regio\'s' },
  { value: 'vlaanderen', label: 'Vlaanderen' },
  { value: 'wallonie', label: 'Wallonië' },
  { value: 'brussel', label: 'Brussel' },
];

function regionLabel(region: string | null): string {
  if (!region) return 'Alle';
  const r = REGIONS.find((r) => r.value === region);
  return r?.label ?? region;
}

function quantityLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'Alle';
  if (min != null && max != null) return `${min}–${max}`;
  if (min != null) return `${min}+`;
  return `≤${max}`;
}

interface RuleFormData {
  objectTypeId: string;
  regime: string;
  region: string;
  minQuantity: string;
  maxQuantity: string;
  odooProductCode: string;
  startPriceProductCode: string;
  labelNl: string;
  priority: string;
  active: boolean;
}

const emptyForm: RuleFormData = {
  objectTypeId: '',
  regime: '',
  region: '',
  minQuantity: '',
  maxQuantity: '',
  odooProductCode: '',
  startPriceProductCode: '',
  labelNl: '',
  priority: '0',
  active: true,
};

function ruleToForm(rule: MappingRule): RuleFormData {
  return {
    objectTypeId: rule.objectTypeId,
    regime: rule.regime ?? '',
    region: rule.region ?? '',
    minQuantity: rule.minQuantity != null ? String(rule.minQuantity) : '',
    maxQuantity: rule.maxQuantity != null ? String(rule.maxQuantity) : '',
    odooProductCode: rule.odooProductCode,
    startPriceProductCode: rule.startPriceProductCode ?? '',
    labelNl: rule.labelNl ?? '',
    priority: String(rule.priority),
    active: rule.active,
  };
}

function formToInput(form: RuleFormData): MappingRuleInput {
  return {
    objectTypeId: form.objectTypeId,
    regime: form.regime || null,
    region: form.region || null,
    minQuantity: form.minQuantity ? Number(form.minQuantity) : null,
    maxQuantity: form.maxQuantity ? Number(form.maxQuantity) : null,
    odooProductCode: form.odooProductCode,
    startPriceProductCode: form.startPriceProductCode || null,
    labelNl: form.labelNl || null,
    priority: Number(form.priority) || 0,
    active: form.active,
  };
}

function RuleFormModal({
  title,
  form,
  setForm,
  objectTypes,
  odooProducts,
  onSave,
  onCancel,
  saving,
}: {
  title: string;
  form: RuleFormData;
  setForm: (f: RuleFormData) => void;
  objectTypes: Array<{ id: string; nameNl: string }>;
  odooProducts: Array<{ code: string; name: string }>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [productSearch, setProductSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!productSearch) return odooProducts.slice(0, 30);
    const q = productSearch.toLowerCase();
    return odooProducts.filter(
      (p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  }, [odooProducts, productSearch]);

  const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Objecttype *</label>
            <select
              className={inputClass}
              value={form.objectTypeId}
              onChange={(e) => setForm({ ...form, objectTypeId: e.target.value })}
            >
              <option value="">Selecteer...</option>
              {objectTypes.map((ot) => (
                <option key={ot.id} value={ot.id}>{ot.nameNl}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Odoo Productcode *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Zoek product..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <select
              className={`${inputClass} mt-1`}
              value={form.odooProductCode}
              onChange={(e) => setForm({ ...form, odooProductCode: e.target.value })}
              size={5}
            >
              {filteredProducts.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            {form.odooProductCode && (
              <p className="text-xs text-gray-500 mt-1">Geselecteerd: {form.odooProductCode}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Startprijs Productcode</label>
            <input
              type="text"
              className={inputClass}
              value={form.startPriceProductCode}
              onChange={(e) => setForm({ ...form, startPriceProductCode: e.target.value })}
              placeholder="bv. PC.EK2.01."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Regio</label>
              <select
                className={inputClass}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Regime</label>
              <input
                type="text"
                className={inputClass}
                value={form.regime}
                onChange={(e) => setForm({ ...form, regime: e.target.value })}
                placeholder="bv. norm, werking"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Min. aantal</label>
              <input
                type="number"
                className={inputClass}
                value={form.minQuantity}
                onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                placeholder="Geen min"
                min={0}
              />
            </div>
            <div>
              <label className={labelClass}>Max. aantal</label>
              <input
                type="number"
                className={inputClass}
                value={form.maxQuantity}
                onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })}
                placeholder="Geen max"
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prioriteit</label>
              <input
                type="number"
                className={inputClass}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                min={0}
              />
              <p className="text-xs text-gray-400 mt-1">Hogere waarde = specifiekere regel wint</p>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded"
                />
                Actief
              </label>
            </div>
          </div>

          <div>
            <label className={labelClass}>Label (NL)</label>
            <input
              type="text"
              className={inputClass}
              value={form.labelNl}
              onChange={(e) => setForm({ ...form, labelNl: e.target.value })}
              placeholder="Beschrijving van de mapping"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Annuleren
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.objectTypeId || !form.odooProductCode}
            className="px-4 py-2 text-sm text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MappingRulesAdmin() {
  const navigate = useNavigate();
  const [filterObjectType, setFilterObjectType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: rules, isLoading } = useMappingRules(filterObjectType || undefined);
  const { data: objectTypes } = useObjectTypesForAdmin();
  const { data: odooProducts } = useOdooProducts();
  const createMutation = useCreateMappingRule();
  const updateMutation = useUpdateMappingRule();
  const deleteMutation = useDeleteMappingRule();

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<MappingRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredRules = useMemo(() => {
    if (!rules) return [];
    if (!searchQuery) return rules;
    const q = searchQuery.toLowerCase();
    return rules.filter(
      (r) =>
        r.objectType.nameNl.toLowerCase().includes(q) ||
        r.odooProductCode.toLowerCase().includes(q) ||
        (r.labelNl && r.labelNl.toLowerCase().includes(q)),
    );
  }, [rules, searchQuery]);

  const groupedRules = useMemo(() => {
    const map = new Map<string, { nameNl: string; rules: MappingRule[] }>();
    for (const rule of filteredRules) {
      const key = rule.objectTypeId;
      if (!map.has(key)) {
        map.set(key, { nameNl: rule.objectType.nameNl, rules: [] });
      }
      map.get(key)!.rules.push(rule);
    }
    return [...map.entries()].sort((a, b) => a[1].nameNl.localeCompare(b[1].nameNl));
  }, [filteredRules]);

  function openCreate() {
    setEditingRule(null);
    setForm({ ...emptyForm, objectTypeId: filterObjectType });
    setShowForm(true);
  }

  function openEdit(rule: MappingRule) {
    setEditingRule(rule);
    setForm(ruleToForm(rule));
    setShowForm(true);
  }

  function handleSave() {
    const input = formToInput(form);
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...input }, { onSuccess: () => setShowForm(false) });
    } else {
      createMutation.mutate(input, { onSuccess: () => setShowForm(false) });
    }
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, { onSuccess: () => setDeleteConfirm(null) });
  }

  const sortedObjectTypes = useMemo(() => {
    if (!objectTypes) return [];
    return [...objectTypes].sort((a, b) => a.nameNl.localeCompare(b.nameNl));
  }, [objectTypes]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/sessions')}
              className="text-sm text-blue-600 hover:underline mb-1"
            >
              &larr; Terug naar sessies
            </button>
            <h1 className="text-2xl font-bold text-blue-800">Mapping Regels</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configureer welke Odoo productcodes gekoppeld worden aan objecttypes, per regio en hoeveelheid.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800"
          >
            + Nieuwe regel
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 max-w-xs"
            value={filterObjectType}
            onChange={(e) => setFilterObjectType(e.target.value)}
          >
            <option value="">Alle objecttypes</option>
            {sortedObjectTypes.map((ot) => (
              <option key={ot.id} value={ot.id}>{ot.nameNl}</option>
            ))}
          </select>
          <input
            type="text"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1"
            placeholder="Zoek op naam, productcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading && <p className="text-gray-500">Laden...</p>}

        {!isLoading && groupedRules.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Geen mapping regels gevonden</p>
          </div>
        )}

        <div className="space-y-4">
          {groupedRules.map(([typeId, group]) => (
            <div key={typeId} className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">{group.nameNl}</h3>
                <p className="text-xs text-gray-400">{group.rules.length} regel(s)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-4 py-2 font-medium">Productcode</th>
                      <th className="px-4 py-2 font-medium">Startprijs</th>
                      <th className="px-4 py-2 font-medium">Regio</th>
                      <th className="px-4 py-2 font-medium">Regime</th>
                      <th className="px-4 py-2 font-medium">Hoeveelheid</th>
                      <th className="px-4 py-2 font-medium">Prioriteit</th>
                      <th className="px-4 py-2 font-medium">Label</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rules.map((rule) => (
                      <tr key={rule.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{rule.odooProductCode}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">
                          {rule.startPriceProductCode ?? '—'}
                        </td>
                        <td className="px-4 py-2">{regionLabel(rule.region)}</td>
                        <td className="px-4 py-2 text-gray-500">{rule.regime ?? '—'}</td>
                        <td className="px-4 py-2">{quantityLabel(rule.minQuantity, rule.maxQuantity)}</td>
                        <td className="px-4 py-2 text-center">{rule.priority}</td>
                        <td className="px-4 py-2 text-gray-500 truncate max-w-[200px]">
                          {rule.labelNl ?? '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                              rule.active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {rule.active ? 'Actief' : 'Inactief'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(rule)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Wijzig
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(rule.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Verwijder
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {showForm && objectTypes && odooProducts && (
          <RuleFormModal
            title={editingRule ? 'Regel bewerken' : 'Nieuwe regel'}
            form={form}
            setForm={setForm}
            objectTypes={sortedObjectTypes}
            odooProducts={odooProducts}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            saving={createMutation.isPending || updateMutation.isPending}
          />
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Regel verwijderen?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Deze actie kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Verwijderen...' : 'Verwijderen'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
