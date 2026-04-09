# ⚙️ SERVICE LAYER CONTRACTS

To repair the ambiguous boundary between the UI, the monolithic Stores, and the Express backend, all features must define explicit Service Contracts in `/services`.

## 1. Universal Service Response

Every network interaction must normalize its return value to a strict ServiceResponse contract to gracefully handle UI loading and error states without nested `try/catch` hell deeply in the UI.

```typescript
// /shared/types/ServiceResponse.ts

export type ServiceResponse<T> = 
  | { status: 'success'; data: T; meta?: { count: number, cursor?: string } }
  | { status: 'error'; message: string; code: string };
```

## 2. Expected Module Service Contracts

Each module must implement an atomic, stateless service. The service executes API checks and converts `snake_case` DB schemas into `camelCase` Typescript UI objects.

### 2.1 MemberService (`frontend/services/memberService.ts`)

```typescript
export interface IMemberService {
  /** Retrieves a paginated list of members */
  getMembers(params: {
    page: number;
    pageSize: number;
    searchQuery?: string;
  }): Promise<ServiceResponse<Member[]>>;

  /** Registers a new member directly */
  createMember(input: Omit<Member, 'id' | 'createdAt'>): Promise<ServiceResponse<Member>>;

  /** Updates an existing member profile */
  updateMember(id: string, updates: Partial<Member>): Promise<ServiceResponse<Member>>;

  /** Logs an attendance record for a service event */
  checkIn(payload: { memberId: string, eventId: string }): Promise<ServiceResponse<void>>;
}
```

### 2.2 VehicleService (`frontend/services/vehicleService.ts`)

```typescript
export interface IVehicleService {
  /** Fetches fleet operation logs */
  getFleet(params: { eventId?: string }): Promise<ServiceResponse<Vehicle[]>>;
  
  /** Updates a vehicle's specific lifecycle stage */
  updateJourneyStage(
    vehicleId: string, 
    stage: VehicleJourneyStage
  ): Promise<ServiceResponse<Vehicle>>;
}
```

### 2.3 EventService (`frontend/services/eventService.ts`)

```typescript
export interface IEventService {
  /** Fetches all ministry events, optionally filtered by type */
  getEvents(limit?: number): Promise<ServiceResponse<MinistryEvent[]>>;
  
  /** Retrieves aggregated department statistics for a single event */
  getEventDashboard(eventId: string): Promise<ServiceResponse<EventStats>>;
}
```

## 3. Transformation Rules (DTO)

Services act as the active boundary between JSON representations. 

* The Service **MUST** map fields explicitly.
* Do not destructure unknown backend responses directly into UI state.

**Example Implementation Rule:**
```typescript
const mapToUserUI = (dto: any): User => ({
  id: dto.id,
  fullName: dto.full_name, // Resolves the name/firstName/lastName split
  phoneNumber: formatPhoneNumber(dto.phone_number), // Pipeline validation
  departmentId: dto.department_id,
  role: mapRoleEnum(dto.role),
});
```
