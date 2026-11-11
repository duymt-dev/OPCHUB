interface DialogBase {
  id: string;
  path: string;
  name: string | RegExp;
  labels: readonly string[];
  close?: string;
}
export type DialogCase = DialogBase &
  ({ button: string; selector?: never } | { selector: string; button?: never });

/** View/create forms only: never click a save/approve/export/generate action. */
export const DIALOGS: readonly DialogCase[] = [
  {
    id: 'member-registration',
    path: '/members?view=list',
    selector: '[data-m="tbl"] button:has(b)',
    name: 'Registration profile',
    labels: ['Groups selected at registration', 'System'],
  },
  {
    id: 'fee-match',
    path: '/fees/transactions',
    button: 'Match manually',
    name: 'Match transaction manually',
    labels: ['Match to', 'Membership fee', 'Fundraising plan'],
    close: 'Cancel',
  },
  {
    id: 'group-create',
    path: '/groups',
    button: '+ Create group',
    name: 'Create new community group',
    labels: ['Group name', 'Short description', 'Group rules'],
  },
  {
    id: 'group-export-options',
    path: '/groups',
    button: 'Export data',
    name: 'Export group member list',
    labels: ['Data fields', 'Format', 'Full name'],
  },
  {
    id: 'persona-create',
    path: '/bots/personas',
    button: '+ Create persona',
    name: 'Persona',
    labels: ['Display name', 'Gender', 'Age range'],
  },
  {
    id: 'script-create',
    path: '/bots/scripts',
    button: '+ Create script',
    name: 'Conversation script',
    labels: ['Conversation type', 'Target groups'],
  },
  {
    id: 'event-create',
    path: '/events',
    button: '+ Create event',
    name: 'Create new event',
    labels: ['Event name', 'Event date', 'Description'],
  },
  {
    id: 'store-details',
    path: '/stores',
    button: 'View',
    name: 'Store details',
    labels: ['Products & services'],
    close: 'Close details',
  },
  {
    id: 'project-review',
    path: '/projects?tab=pending',
    button: 'View & review',
    name: 'View & review project',
    labels: ['Detailed description', 'Feedback to the author'],
  },
  {
    id: 'investor-details',
    path: '/investors',
    button: 'Details',
    name: 'Investor details',
    labels: ['Business / Fund', 'Phone number', 'Total investment interest'],
  },
  {
    id: 'service-request',
    path: '/requests',
    button: 'Details',
    name: /^Request YC-/,
    labels: ['Service', 'Internal discussion'],
  },
  {
    id: 'campaign-create',
    path: '/marketing',
    button: '+ Create campaign',
    name: 'Create email campaign',
    labels: ['Campaign name', 'Email subject', 'Body'],
  },
  {
    id: 'administrator-create',
    path: '/settings?tab=admins',
    button: '+ Create administrator account',
    name: 'Create administrator account',
    labels: ['Full name', 'Sign-in email', 'Temporary password'],
    close: 'Cancel',
  },
  {
    id: 'ai-call-log',
    path: '/settings?tab=llm',
    button: 'View call log',
    name: 'AI call log',
    labels: ['Log provider', 'AI purpose', 'Call status'],
  },
];
