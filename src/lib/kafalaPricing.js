export const KAFALA_DEFAULTS={
  transferFee1:2000,transferFee2:4000,transferFee3:6000,
  transferBumpOccupations:['6d7ccefc-1647-4a36-9a80-ad1f9138db84','f3163bc5-a3e1-4e93-a620-7421db3abc68','8152564f-7a31-430c-9cb3-a76f5df77c04','0394376f-b7e0-455c-8466-0555d477cc42','ebd99f6b-ae4c-453c-9cf5-19099b7f35a3','a4cbe92d-69f8-4129-a876-0dc035fb9bf7','efd9f7af-7ac6-4f3e-9fda-efbc7d95ea61','5a20783b-8a28-4364-bbb8-85fbc71fc291','5ec4a1ba-64e9-4df7-badf-bf12eaf005ba','2feff711-f1d2-489c-870b-ab82b7de9cbd','0e6cd55b-1ced-4d88-ac37-ccfcafd244ec','01f7dcd3-1b72-4ade-bf21-95dc7f819463','09858dcd-0057-4857-a225-ce626313d457'],
  iqamaPerMonth:54.2,iqamaFine1:500,iqamaFine2:1000,iqamaGraceDays:7,iqamaProcessingDays:7,iqamaExpiredThresholdDays:30,procDaysCase1:7,procDaysCase2:7,procDaysCase3:7,thresholdCase2:30,transferOnlyMinDays:30,
  workPermit3M:25,workPermit6M:50,workPermit9M:75,workPermit12M:100,
  workPermitDailyAfter:22,workPermitCutoffDate:'2027-02-20',
  workPermitProcDays:7,workPermitExpiredThreshold:30,workPermitExpiredProcDays:7,
  profChange:1000,profChangeFreeOccupations:['2381e970-e939-4c6b-a7a9-8862f2133d41','1b4568be-0ea5-4079-bc90-ecca71d30adb'],officeFee:6500,officeDailyRate:18.06,officeFlatMonths:12,
  medicalGraceMonths:2,medicalGraceDays:7,
  medicalBrackets:[{min:20,max:30,rate:400},{min:30,max:40,rate:500},{min:40,max:50,rate:600},{min:50,max:60,rate:700},{min:60,max:70,rate:900}]
}

export function getKafalaPricingConfig(){
  try{const r=JSON.parse(localStorage.getItem('kafalaPricingConfig')||'{}');return{...KAFALA_DEFAULTS,...r,medicalBrackets:Array.isArray(r.medicalBrackets)&&r.medicalBrackets.length?r.medicalBrackets:KAFALA_DEFAULTS.medicalBrackets}}catch{return{...KAFALA_DEFAULTS}}
}

export function setKafalaPricingConfig(partial){
  const cur=getKafalaPricingConfig()
  const next={...cur,...partial}
  localStorage.setItem('kafalaPricingConfig',JSON.stringify(next))
}
