export const departmentMap = {
  administration: {
    uuid: '0b685c69-edb6-44b9-8f21-1a11878b6d7b',
    slug: 'administration'
  },
  registration: {
    uuid: '81b8b740-6663-4179-bcfb-e3dc7524d36c',
    slug: 'registration'
  },
  nextGen: {
    uuid: 'a9aff0dc-1a78-4c00-ad29-4531942670d0',
    slug: 'next-gen'
  },
  parking: {
    uuid: '65808f94-cf1c-4e0f-b7f0-d3ac2b49d20a',
    slug: 'parking'
  },
  finance: {
    uuid: 'e35f6789-1862-4c31-8b13-96d59463d257',
    slug: 'finance'
  },
  transportation: {
    uuid: '4630e48a-f97e-48fd-a901-864b591c282f',
    slug: 'transportation'
  },
  followUp: {
    uuid: 'e680342f-72c7-4d10-b7cb-631725afe770',
    slug: 'follow-up'
  },
  schools: {
    uuid: '4d99940e-58ec-40ba-92bd-4a65651bf23a',
    slug: 'schools'
  },
  healing: {
    uuid: 'f1a0d749-d681-4150-9764-aecfeac8b0ca',
    slug: 'healing'
  },
  campus: {
    uuid: 'b2c1d3e4-f5a6-7890-bcde-1234567890ab',
    slug: 'campus'
  },
  residents: {
    uuid: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    slug: 'residents'
  }
};

export function resolveDepartment(id: string) {
  return Object.values(departmentMap).find(
    d => d.uuid === id || d.slug === id
  );
}
