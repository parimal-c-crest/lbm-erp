import { UomGroupForm } from '@/components/shared/UomGroupForm';

// Group Create (`docs-kit/5-modules/uom/9-ui.md` §4 Group Detail/Edit — create mode). Blank form,
// not pre-filled with mock data, since that's what "create" means (Module Design-First Strategy).
export default function NewUomGroupPage() {
  return <UomGroupForm />;
}
