import { PlotStatus, PlotFacing, PlotType, AreaUnit } from '@prisma/client';

export interface CreatePlotDTO {
  plotNumber: string;
  plotType?: PlotType;
  status?: PlotStatus;
  area: number;
  areaUnit?: AreaUnit;
  length?: number;
  width?: number;
  facing?: PlotFacing;
  block?: string;
  sector?: string;
  layoutReference?: string;
  basePricePerUnit?: number;
  totalPrice: number;
  currency?: string;
  isCornerPlot?: boolean;
  isParkFacing?: boolean;
  premiumCharges?: number;
  description?: string;
}

export interface UpdatePlotDTO {
  plotNumber?: string;
  plotType?: PlotType;
  status?: PlotStatus;
  area?: number;
  areaUnit?: AreaUnit;
  length?: number;
  width?: number;
  facing?: PlotFacing;
  block?: string;
  sector?: string;
  layoutReference?: string;
  basePricePerUnit?: number;
  totalPrice?: number;
  currency?: string;
  isCornerPlot?: boolean;
  isParkFacing?: boolean;
  premiumCharges?: number;
  description?: string;
}

export interface PlotFilterQuery {
  status?: PlotStatus;
  plotType?: PlotType;
  facing?: PlotFacing;
  block?: string;
  sector?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  isCornerPlot?: boolean;
  isParkFacing?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

