export type MacroPoint = {
  date: string;
  month: string;
  spx: number;
  m2: number;
  m2Month: string;
  corporateProfits: number;
  corporateProfitsMonth: string;
  tenYearYield: number;
  tenYearYieldMonth: string;
  gdp: number;
  gdpMonth: string;
  spxOverM2: number;
  profitSupport: number;
  m2OverGdp: number;
  profitSupportIndex: number;
  tenYearYieldIndex: number;
  rateHurdleIndex: number;
  m2OverGdpIndex: number;
};

export type RatioCandle = {
  time: string;
  quarter: string;
  open: number;
  high: number;
  low: number;
  close: number;
  spx: number;
  m2: number;
};

export type MacroData = {
  meta: {
    generatedAt: string;
    startMonth: string;
    sources: Array<{
      name: string;
      url: string;
    }>;
    notes: string[];
  };
  metrics: {
    currentDate: string;
    currentMonth: string;
    currentSPX: number;
    currentM2: number;
    currentSPXOverM2: number;
    dotComPeakDate: string;
    dotComPeakMonth: string;
    dotComPeakSPX: number;
    dotComPeakM2: number;
    dotComPeakCorporateProfits: number;
    dotComPeakProfitSupport: number;
    dotComPeakTenYearYield: number;
    dotComPeakGDP: number;
    dotComPeakM2OverGDP: number;
    dotComPeakSPXOverM2: number;
    ratioVsDotComPeak: number;
    spxNominalSinceDotComPeak: number;
    m2SinceDotComPeak: number;
    currentCorporateProfits: number;
    currentCorporateProfitsMonth: string;
    currentProfitSupport: number;
    currentProfitSupportIndex: number;
    currentTenYearYield: number;
    currentTenYearYieldMonth: string;
    currentTenYearYieldIndex: number;
    currentRateHurdleIndex: number;
    currentGDP: number;
    currentGDPMonth: string;
    currentM2OverGDP: number;
    currentM2OverGDPIndex: number;
  };
  series: {
    monthly: MacroPoint[];
    quarterlies: RatioCandle[];
  };
};
