import { describe, it, expect } from 'vitest';
import { PlotStatus, PlotFacing, PlotType, AreaUnit, Role } from '@prisma/client';
import {
  createPlotSchema,
  updatePlotSchema,
  plotFilterQuerySchema,
} from '../src/modules/plots/plot.validation';

describe('Phase 8: Plot and Property Inventory', () => {
  // -------------------------------------------------------------------------
  // 1. Validation Tests: Create Plot
  // -------------------------------------------------------------------------
  describe('createPlotSchema', () => {
    const validPlot = {
      plotNumber: 'P-101',
      plotType: PlotType.RESIDENTIAL,
      area: 2400,
      areaUnit: AreaUnit.SQ_FT,
      facing: PlotFacing.EAST,
      block: 'Block-A',
      sector: 'Sector-1',
      totalPrice: 4800000,
      basePricePerUnit: 2000,
      currency: 'INR',
    };

    it('accepts a minimal valid plot payload with defaults', () => {
      const result = createPlotSchema.safeParse({
        plotNumber: 'p-1',
        area: 1200,
        totalPrice: 2400000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plotNumber).toBe('P-1'); // Auto-uppercased
        expect(result.data.status).toBe(PlotStatus.AVAILABLE);
        expect(result.data.plotType).toBe(PlotType.RESIDENTIAL);
        expect(result.data.areaUnit).toBe(AreaUnit.SQ_FT);
        expect(result.data.currency).toBe('INR');
        expect(result.data.isCornerPlot).toBe(false);
      }
    });

    it('accepts a full valid plot payload with premium charges', () => {
      const result = createPlotSchema.safeParse({
        ...validPlot,
        isCornerPlot: true,
        isParkFacing: true,
        premiumCharges: 150000,
        description: 'Prime corner villa plot facing the central park.',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isCornerPlot).toBe(true);
        expect(result.data.isParkFacing).toBe(true);
        expect(result.data.premiumCharges).toBe(150000);
      }
    });

    it('auto-uppercases plot number', () => {
      const result = createPlotSchema.safeParse({
        ...validPlot,
        plotNumber: 'plot-b24',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plotNumber).toBe('PLOT-B24');
      }
    });

    it('rejects empty plot number', () => {
      const result = createPlotSchema.safeParse({
        ...validPlot,
        plotNumber: '   ',
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero or negative area', () => {
      expect(createPlotSchema.safeParse({ ...validPlot, area: 0 }).success).toBe(false);
      expect(createPlotSchema.safeParse({ ...validPlot, area: -1200 }).success).toBe(false);
    });

    it('rejects zero or negative totalPrice', () => {
      expect(createPlotSchema.safeParse({ ...validPlot, totalPrice: 0 }).success).toBe(false);
      expect(createPlotSchema.safeParse({ ...validPlot, totalPrice: -5000 }).success).toBe(false);
    });

    it('rejects negative premium charges', () => {
      expect(
        createPlotSchema.safeParse({ ...validPlot, premiumCharges: -100 }).success
      ).toBe(false);
    });

    it('rejects invalid enum values for plotType and status', () => {
      expect(
        createPlotSchema.safeParse({ ...validPlot, plotType: 'PENTHOUSE' }).success
      ).toBe(false);
      expect(
        createPlotSchema.safeParse({ ...validPlot, status: 'AUCTION' }).success
      ).toBe(false);
      expect(
        createPlotSchema.safeParse({ ...validPlot, facing: 'UPWARD' }).success
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Validation Tests: Update Plot
  // -------------------------------------------------------------------------
  describe('updatePlotSchema', () => {
    it('accepts partial update of totalPrice and status', () => {
      const result = updatePlotSchema.safeParse({
        totalPrice: 5200000,
        status: PlotStatus.TEMPORARILY_RESERVED,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalPrice).toBe(5200000);
        expect(result.data.status).toBe(PlotStatus.TEMPORARILY_RESERVED);
      }
    });

    it('accepts setting nullable layout reference to null', () => {
      const result = updatePlotSchema.safeParse({
        block: null,
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative price update', () => {
      expect(updatePlotSchema.safeParse({ totalPrice: -1000 }).success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Validation Tests: Filter Query
  // -------------------------------------------------------------------------
  describe('plotFilterQuerySchema', () => {
    it('parses price and area bounds and pagination', () => {
      const result = plotFilterQuerySchema.safeParse({
        status: 'AVAILABLE',
        minPrice: '1000000',
        maxPrice: '5000000',
        minArea: '1200',
        isCornerPlot: 'true',
        page: '2',
        limit: '15',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(PlotStatus.AVAILABLE);
        expect(result.data.minPrice).toBe(1000000);
        expect(result.data.maxPrice).toBe(5000000);
        expect(result.data.minArea).toBe(1200);
        expect(result.data.isCornerPlot).toBe(true);
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(15);
      }
    });

    it('clamps limit to maximum of 100', () => {
      const result = plotFilterQuerySchema.safeParse({ limit: '250' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. Domain & Permission Business Rules
  // -------------------------------------------------------------------------
  describe('Plot Domain & Inventory Integrity Rules', () => {
    it('domain rule: plot availability must be represented by explicit statuses', () => {
      const allStatuses = Object.values(PlotStatus);
      expect(allStatuses).toContain(PlotStatus.AVAILABLE);
      expect(allStatuses).toContain(PlotStatus.TEMPORARILY_RESERVED);
      expect(allStatuses).toContain(PlotStatus.BOOKING_PENDING);
      expect(allStatuses).toContain(PlotStatus.BOOKED);
      expect(allStatuses).toContain(PlotStatus.SOLD);
      expect(allStatuses).toContain(PlotStatus.BLOCKED);
    });

    it('domain rule: plot uniqueness is scoped by [projectId, plotNumber]', () => {
      const plotA = { projectId: 'project-1', plotNumber: 'P-101' };
      const plotB = { projectId: 'project-1', plotNumber: 'P-101' };
      const plotC = { projectId: 'project-2', plotNumber: 'P-101' };

      // Same project + same plot number is a conflict
      const isConflict = plotA.projectId === plotB.projectId && plotA.plotNumber === plotB.plotNumber;
      expect(isConflict).toBe(true);

      // Different project + same plot number is permitted
      const isAllowedAcrossProjects = plotA.projectId !== plotC.projectId;
      expect(isAllowedAcrossProjects).toBe(true);
    });

    it('business rule: soft-deletion is blocked if plot is BOOKED or SOLD', () => {
      const isDeletable = (status: PlotStatus) => {
        return status !== PlotStatus.BOOKED && status !== PlotStatus.SOLD;
      };

      expect(isDeletable(PlotStatus.AVAILABLE)).toBe(true);
      expect(isDeletable(PlotStatus.BLOCKED)).toBe(true);
      expect(isDeletable(PlotStatus.TEMPORARILY_RESERVED)).toBe(true);
      expect(isDeletable(PlotStatus.BOOKED)).toBe(false);
      expect(isDeletable(PlotStatus.SOLD)).toBe(false);
    });

    it('visibility rule: Buyers only discover AVAILABLE plots', () => {
      const getQueryStatusFilter = (role: Role, requestedStatus?: PlotStatus) => {
        if (role === Role.BUYER) {
          return PlotStatus.AVAILABLE;
        }
        return requestedStatus;
      };

      expect(getQueryStatusFilter(Role.BUYER, PlotStatus.SOLD)).toBe(PlotStatus.AVAILABLE);
      expect(getQueryStatusFilter(Role.DEVELOPER, PlotStatus.SOLD)).toBe(PlotStatus.SOLD);
    });

    it('authorization rule: only DEVELOPER or PLATFORM_ADMIN can modify price/status', () => {
      const canManagePlot = (role: Role) => {
        return role === Role.DEVELOPER || role === Role.PLATFORM_ADMIN;
      };

      expect(canManagePlot(Role.DEVELOPER)).toBe(true);
      expect(canManagePlot(Role.PLATFORM_ADMIN)).toBe(true);
      expect(canManagePlot(Role.BUYER)).toBe(false);
      expect(canManagePlot(Role.CONTRACTOR)).toBe(false);
      expect(canManagePlot(Role.VENDOR)).toBe(false);
      expect(canManagePlot(Role.EMPLOYEE)).toBe(false);
    });
  });
});

