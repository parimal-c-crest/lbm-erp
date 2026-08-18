import { redirect } from 'next/navigation';

// Unit of Measure landing (`docs-kit/5-modules/uom/9-ui.md` §3 Navigation — "Unit of Measure
// landing -> tabs or sub-nav for Categories / Types / Functional Roles / Groups"). Groups is the
// module's central screen (§4 Group Detail/Edit), so the landing redirects straight there;
// `UomSubNav` (rendered on every UOM sub-screen) supplies the tab switcher.
export default function UomLandingPage() {
  redirect('/settings/uom/groups');
}
