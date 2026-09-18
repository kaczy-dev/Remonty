import { describe, it, expect } from 'vitest';
import { createProjectFromTemplate, duplicateProject } from './project-templates';
import { INITIAL_RENOVATION_PROJECT } from './default-data';

describe('Project Templates and Duplication Engine', () => {
  it('creates a studio template project', () => {
    const project = createProjectFromTemplate({
      title: 'Kawalerka Mokotów',
      address: 'ul. Racławicka 10, Warszawa',
      budget: 65000,
      templateType: 'studio',
    });

    expect(project.title).toBe('Kawalerka Mokotów');
    expect(project.totalPlannedBudget).toBe(65000);
    expect(project.rooms.length).toBe(2);
    expect(project.rooms.map((r) => r.name)).toContain('Pokój Dzienny z Aneksem');
    expect(project.rooms.map((r) => r.name)).toContain('Łazienka z Prysznicem');
    expect(project.selectedRoomId).toBe(project.rooms[0].id);
  });

  it('creates a two-room template project', () => {
    const project = createProjectFromTemplate({
      title: 'Mieszkanie 2-pokojowe',
      address: 'ul. Marszałkowska, Warszawa',
      budget: 85000,
      contingencyPercent: 20,
      templateType: 'two_room',
    });

    expect(project.rooms.length).toBe(4);
    expect(project.contingencyReservePercent).toBe(20);
  });

  it('duplicates an existing project with unique IDs', () => {
    const copy = duplicateProject(INITIAL_RENOVATION_PROJECT, 'Kopia Testowa');

    expect(copy.id).not.toBe(INITIAL_RENOVATION_PROJECT.id);
    expect(copy.title).toBe('Kopia Testowa');
    expect(copy.rooms.length).toBe(INITIAL_RENOVATION_PROJECT.rooms.length);
    expect(copy.rooms[0].id).not.toBe(INITIAL_RENOVATION_PROJECT.rooms[0].id);
    expect(copy.selectedRoomId).toBe(copy.rooms[0].id);
  });
});
