# Farm Management Application Requirements

## Technology Stack

- **Frontend**: React with JavaScript (no TypeScript)
- **Backend**: Tauri framework
- **Database**: SQLite
- **Language**: French UI/UX and database content

## Core Features

### 1. Farm Management (Gestion des Fermes)

- **Farms Table**: Store farm information with just a name field
- Each farm can contain multiple flocks (bandes)
- CRUD operations for farm management

### 2. Personnel Management (Gestion du Personnel)

- **Personnel Table**: Store caretaker information
  - Name (Nom)
  - Phone number (Téléphone)
- Personnel can be assigned to manage one or multiple flocks
- Personnel assignments can be changed over time
- CRUD operations for personnel management

### 3. Flock Management (Gestion des Bandes)

Each flock (bande) contains:

- **Entry date** (Date d'entrée)
- **Quantity** (Quantité)
- **Farm assignment** (Ferme)
- **Building number** (Numéro de bâtiment)
- **Chick type** (Type de poussin)
- **Assigned personnel** (Personnel assigné)

### 4. Weekly Management Structure (Structure de Gestion Hebdomadaire)

Each flock (bande) has **5-9 weeks** of tracking, and each week contains **7 daily entries** plus weekly weight data.

**Structure Hierarchy:**

- **Bande** (Flock) → **Semaines** (Weeks: 5-9) → **Jours** (Days: 7 per week)

#### Daily Tracking Table (Suivi Quotidien)

Each day within a week tracks detailed daily activities:

| Âge | Décès (jour) | Décès (total) | Alimentation (jour) | Alimentation (total) | Soins     | Quantité Soins | Analyses | Remarques |
| --- | ------------ | ------------- | ------------------- | -------------------- | --------- | -------------- | -------- | --------- |
| 1   | 40           | 40            | 40                  | 40                   | Roxassisn | 5l             |          |           |
| 2   | 30           | 70            | 40                  | 80                   |           |                |          |           |
| 3   |              |               |                     |                      |           |                |          |           |
| 4   |              |               |                     |                      |           |                |          |           |
| 5   |              |               |                     |                      |           |                |          |           |
| 6   |              |               |                     |                      |           |                |          |           |
| 7   |              |               |                     |                      |           |                |          |           |

For each bande, I will have multiple of these.

**Daily Columns:**

- **Âge**: Age in days from hatch (cumulative, increments each day)
- **Décès (jour)**: Daily deaths
- **Décès (total)**: Total cumulative deaths (current day deaths + previous total)
- **Alimentation (jour)**: Daily feed consumption
- **Alimentation (total)**: Total cumulative feed consumption (current day feed + previous total)
- **Soins**: Care/treatment name (referenced from soins table by ID)
- **Quantité Soins**: Quantity of care/treatment applied
- **Analyses**: Analysis results
- **Remarques**: Daily remarks/notes

#### Weekly Weight Tracking (Suivi du Poids Hebdomadaire)

Each week also tracks the average chick weight directly in the semaines table:

| Semaine | Poids (g) |
| ------- | --------- |
| 1       | 45        |
| 2       | 120       |
| 3       | 280       |

**Important Calculation Logic:**

- **Décès (total)** = Décès (jour) actuel + Décès (total) du jour précédent
- **Alimentation (total)** = Alimentation (jour) actuel + Alimentation (total) du jour précédent

### 5. Care Management (Gestion des Soins)

- **Care Database**: Central repository for all care/treatment names
- Care entries format: "Care Name - Quantity (Unit)"
  - Example: "Roxassisn - 5l"
  - Units can be: kg, l, etc.
- Dropdown/autocomplete selection from existing care database when filling weekly tables

### 6. Weekly Summary Data

For each week, track:

- **Total deaths** for the week
- **Chick size/weight** (numerical value representing average chick size for that week)

### 7. Flock Notes (Notes de Bande)

- **Free-text notes** field for each flock
- Allow caretakers to add detailed observations, special events, or important information about each flock

## Technical Requirements

### Code Architecture

- **Clean Architecture**: Implement proper separation of concerns
- **Service Layer**: Create dedicated services for business logic
- **Repository Pattern**: Abstract data access layer
- **Component-based**: Modular React components
- **Custom Hooks**: For state management and API calls

### Database Design

- **Proper Indexing**: Optimize all frequently queried columns
- **Foreign Key Constraints**: Maintain data integrity
- **Normalized Schema**: Reduce data redundancy
- **Performance Optimization**: Query optimization for long-term scalability

### Error Handling & Validation

- **Input Validation**: Client-side and server-side validation
- **Custom Error Messages**: All error messages in French
- **Toast Notifications**:
  - Error messages with custom French text
  - Success messages for completed actions
  - React Toast implementation
- **Graceful Degradation**: Handle edge cases and network issues

### User Interface

- **French Language**: All UI text, labels, and messages in French
- **Responsive Design**: Mobile and desktop compatibility
- **Intuitive Navigation**: Easy switching between farms, flocks, and personnel
- **Data Tables**: Professional-looking tables with proper formatting

### Backend Features

- **Pagination**: Server-side pagination for all data tables
- **Filtering**: Backend filtering capabilities for large datasets
- **Sorting**: Multi-column sorting support
- **Search Functionality**: Full-text search across relevant fields

### Performance & Scalability

- **Database Optimization**: Proper indexing strategy for long-term performance
- **Memory Management**: Efficient data loading and caching
- **Query Optimization**: Prevent N+1 queries and optimize join operations
- **Data Archiving Strategy**: Plan for handling years of accumulated data
- **Connection Pooling**: Efficient database connection management

### Data Persistence

- **Backup Strategy**: Automated SQLite database backups
- **Data Migration**: Version control for database schema changes
- **Import/Export**: Ability to export data for reporting
- **Data Validation**: Ensure data consistency across all operations

## Database Schema Overview

### Tables:

1. **fermes**

   - id (Clé Primaire)
   - nom

2. **personnel**

   - id (Clé Primaire)
   - nom
   - telephone

3. **bandes**

   - id (Clé Primaire)
   - date_entree
   - quantite
   - ferme_id (Clé Étrangère)
   - numero_batiment
   - type_poussin
   - personnel_id (Clé Étrangère)
   - notes

4. **semaines**

   - id (Clé Primaire)
   - bande_id (Clé Étrangère)
   - numero_semaine (1-9)
   - poids

5. **suivi_quotidien**

   - id (Clé Primaire)
   - semaine_id (Clé Étrangère)
   - age
   - deces_par_jour
   - deces_total
   - alimentation_par_jour
   - alimentation_total
   - soins_id (Clé Étrangère vers table soins)
   - soins_quantite
   - analyses
   - remarques

6. **soins**
   - id (Clé Primaire)
   - nom
   - unit

This application should be built to handle years of operation with consistent performance, proper data integrity, and a user-friendly French interface suitable for farm management personnel.

So after a year, the app won’t slow down — that’s why query and database optimization is crucial.
I want a clean and minimal UI design using shadcn.
