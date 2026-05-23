// SBC CR API field dictionary.
//
// Source of truth: SBC Tayseer portal — response shape of
//   POST /sbc/externalgw/ipapi-nl/api/app/mcV2/get-crs-by-personal-identifier-number
// (plus the related management/partner sub-structures).
//
// Arabic labels are the canonical ones supplied by the operator; English
// labels are best-effort derived. Edit the English column freely when you
// have a better translation.
//
// Use via the `sbcLabel(key, lang)` helper. Unknown keys fall back to the
// raw key so missing entries are visible in the UI rather than silently empty.

export const SBC_FIELDS = {
  // ── CR information (crInformation) ──
  crNationalNumber: { ar: 'الرقم الموحد للمنشأة', en: 'Unified number' },
  crNumber: { ar: 'رقم السجل التجاري', en: 'CR number' },
  versionNo: { ar: 'رقم الإصدار', en: 'Version number' },
  entityFullNameAr: { ar: 'الاسم الكامل للمنشأة (عربي)', en: 'Entity full name (AR)' },
  entityFullNameEn: { ar: 'الاسم الكامل للمنشأة (إنجليزي)', en: 'Entity full name (EN)' },
  capital: { ar: 'رأس المال', en: 'Capital' },
  companyDuration: { ar: 'مدة الشركة', en: 'Company duration' },
  deleteDate: { ar: 'تاريخ الشطب', en: 'Strike-off date' },
  isMain: { ar: 'سجل رئيسي', en: 'Is main' },
  mainCRNationalNumber: { ar: 'الرقم الموحد للسجل الرئيسي', en: 'Main CR unified number' },
  mainCRNumber: { ar: 'رقم السجل التجاري الرئيسي', en: 'Main CR number' },
  isLicenseBased: { ar: 'قائم على ترخيص', en: 'License-based' },
  isSurveyRequired: { ar: 'يتطلب استبيان', en: 'Survey required' },
  hasEcommerce: { ar: 'لديه نشاط تجارة إلكترونية', en: 'Has e-commerce' },
  inLiquidationProcess: { ar: 'تحت التصفية', en: 'In liquidation' },
  isInConfirmationPeriod: { ar: 'في فترة التأكيد', en: 'In annual confirmation window' },
  isManager: { ar: 'مدير', en: 'Is manager' },
  isPartner: { ar: 'شريك', en: 'Is partner' },
  partnershipTypes: { ar: 'أنواع الشراكة', en: 'Partnership types' },
  companyCharacterList: { ar: 'صفات الشركة', en: 'Company characters' },
  companyContractFromDate: { ar: 'تاريخ عقد التأسيس', en: 'Incorporation contract date' },
  lastCrSuspensionDate: { ar: 'تاريخ آخر تعليق', en: 'Last suspension date' },
  lastCrReactivationDate: { ar: 'تاريخ آخر إعادة تفعيل', en: 'Last reactivation date' },
  licenseIssuer: { ar: 'جهة إصدار الترخيص', en: 'License issuer' },
  encryptedCrNationalNumber: { ar: 'الرقم الموحد المشفّر', en: 'Encrypted unified number' },
  encryptedCrNumber: { ar: 'رقم السجل المشفّر', en: 'Encrypted CR number' },
  encryptedMainCrNationalNumber: { ar: 'الرقم الموحد المشفّر للسجل الرئيسي', en: 'Encrypted main unified number' },
  encryptedMainCrNumber: { ar: 'رقم السجل الرئيسي المشفّر', en: 'Encrypted main CR number' },
  prints: { ar: 'خيارات الطباعة', en: 'Print options' },
  id: { ar: 'المعرّف', en: 'ID' },

  // Language of the entity name
  entityNameLang: { ar: 'لغة اسم المنشأة', en: 'Entity name language' },
  entityNameLangID: { ar: 'معرّف لغة الاسم', en: 'Entity name language ID' },
  entityNameLangDescAr: { ar: 'وصف لغة الاسم (عربي)', en: 'Name language description (AR)' },
  entityNameLangDescEn: { ar: 'وصف لغة الاسم (إنجليزي)', en: 'Name language description (EN)' },

  // Entity type
  entityType: { ar: 'نوع المنشأة', en: 'Entity type' },
  entityTypeID: { ar: 'معرّف نوع المنشأة', en: 'Entity type ID' },
  entityTypeDescAr: { ar: 'وصف نوع المنشأة (عربي)', en: 'Entity type description (AR)' },
  entityTypeDescEn: { ar: 'وصف نوع المنشأة (إنجليزي)', en: 'Entity type description (EN)' },

  // Capital currency
  capitalCurrency: { ar: 'عملة رأس المال', en: 'Capital currency' },
  capitalCurrencyID: { ar: 'معرّف العملة', en: 'Currency ID' },
  capitalCurrencyDescAr: { ar: 'وصف العملة (عربي)', en: 'Currency description (AR)' },
  capitalCurrencyDescEn: { ar: 'وصف العملة (إنجليزي)', en: 'Currency description (EN)' },

  // Headquarter city
  headquarterCity: { ar: 'مدينة المركز الرئيسي', en: 'Headquarter city' },
  headquarterCityID: { ar: 'معرّف المدينة', en: 'City ID' },
  headquarterCityNameAr: { ar: 'اسم المدينة (عربي)', en: 'City name (AR)' },
  headquarterCityNameEn: { ar: 'اسم المدينة (إنجليزي)', en: 'City name (EN)' },

  // Company legal form
  companyForm: { ar: 'الشكل القانوني للشركة', en: 'Company legal form' },
  companyFormID: { ar: 'معرّف الشكل القانوني', en: 'Legal form ID' },
  companyFormDescriptionAr: { ar: 'وصف الشكل القانوني (عربي)', en: 'Legal form description (AR)' },
  companyFormDescriptionEn: { ar: 'وصف الشكل القانوني (إنجليزي)', en: 'Legal form description (EN)' },

  // Partners' nationality (header-level)
  partnersNationality: { ar: 'جنسية الشركاء', en: 'Partners nationality' },
  partnersNationalityID: { ar: 'معرّف جنسية الشركاء', en: 'Partners nationality ID' },
  partnersNationalityDescAr: { ar: 'وصف جنسية الشركاء (عربي)', en: 'Partners nationality (AR)' },
  partnersNationalityDescEn: { ar: 'وصف جنسية الشركاء (إنجليزي)', en: 'Partners nationality (EN)' },

  // Issue & confirm dates
  crIssueDate: { ar: 'تاريخ إصدار السجل', en: 'CR issue date' },
  crIssueDateGregorian: { ar: 'تاريخ الإصدار (ميلادي)', en: 'Issue date (Gregorian)' },
  crIssueDateHijri: { ar: 'تاريخ الإصدار (هجري)', en: 'Issue date (Hijri)' },
  crConfirmDate: { ar: 'تاريخ تأكيد السجل', en: 'CR confirmation date' },
  crConfirmDateGregorian: { ar: 'تاريخ التأكيد (ميلادي)', en: 'Confirmation date (Gregorian)' },
  crConfirmDateHijri: { ar: 'تاريخ التأكيد (هجري)', en: 'Confirmation date (Hijri)' },

  // CR status
  crStatus: { ar: 'حالة السجل التجاري', en: 'CR status' },
  crStatusID: { ar: 'معرّف حالة السجل', en: 'CR status ID' },
  crStatusDescAr: { ar: 'وصف حالة السجل (عربي)', en: 'CR status description (AR)' },
  crStatusDescEn: { ar: 'وصف حالة السجل (إنجليزي)', en: 'CR status description (EN)' },

  // Procedures & licenses (catalog items attached to the CR)
  procedures: { ar: 'الإجراءات المتاحة', en: 'Available procedures' },
  licenses: { ar: 'التراخيص', en: 'Licenses' },
  serviceCatalogId: { ar: 'معرّف الخدمة في كتالوج الخدمات', en: 'Service catalog ID' },
  nameAr: { ar: 'الاسم (عربي)', en: 'Name (AR)' },
  nameEn: { ar: 'الاسم (إنجليزي)', en: 'Name (EN)' },
  quickAction: { ar: 'إجراء سريع', en: 'Quick action' },

  // ── crActivities ──
  crActivities: { ar: 'أنشطة السجل التجاري', en: 'CR activities' },
  activitiesType: { ar: 'نوع تصنيف الأنشطة', en: 'Activity classification type' },
  activitiesTypeID: { ar: 'معرّف نوع التصنيف', en: 'Classification type ID' },
  activitiesTypeDescriptionAr: { ar: 'وصف نوع التصنيف (عربي)', en: 'Classification type (AR)' },
  activitiesTypeDescriptionEn: { ar: 'وصف نوع التصنيف (إنجليزي)', en: 'Classification type (EN)' },
  activityList: { ar: 'قائمة الأنشطة', en: 'Activity list' },
  activityID: { ar: 'رمز النشاط', en: 'Activity code' },
  activityDescriptionAr: { ar: 'وصف النشاط (عربي)', en: 'Activity description (AR)' },
  activityDescriptionEn: { ar: 'وصف النشاط (إنجليزي)', en: 'Activity description (EN)' },
  isPreLicenseIssued: { ar: 'صدر له ترخيص مسبق', en: 'Pre-license issued' },
  isPostLicenseIssued: { ar: 'صدر له ترخيص لاحق', en: 'Post-license issued' },
  fullActivitiesText: { ar: 'النص الكامل للأنشطة', en: 'Full activities text' },

  // ── contactInformation ──
  contactInformation: { ar: 'معلومات الاتصال', en: 'Contact information' },
  phoneNo: { ar: 'رقم الهاتف', en: 'Phone number' },
  mobileNo: { ar: 'رقم الجوال', en: 'Mobile number' },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  websiteURL: { ar: 'الموقع الإلكتروني', en: 'Website URL' },

  // ── mangmentInformation (sic — keep the SBC misspelling) ──
  mangmentInformation: { ar: 'معلومات الإدارة', en: 'Management information' },
  managementStructure: { ar: 'الهيكل الإداري', en: 'Management structure' },
  managementStructureID: { ar: 'معرّف الهيكل الإداري', en: 'Management structure ID' },
  managementStructureDescriptionAr: { ar: 'وصف الهيكل الإداري (عربي)', en: 'Management structure (AR)' },
  managementStructureDescriptionEn: { ar: 'وصف الهيكل الإداري (إنجليزي)', en: 'Management structure (EN)' },
  managerList: { ar: 'قائمة المدراء', en: 'Manager list' },
  isLicensed: { ar: 'مرخّص', en: 'Licensed' },
  managerType: { ar: 'نوع المدير', en: 'Manager type' },
  managerTypeID: { ar: 'معرّف نوع المدير', en: 'Manager type ID' },
  managerTypeDescriptionAr: { ar: 'وصف نوع المدير (عربي)', en: 'Manager type (AR)' },
  managerTypeDescriptionEn: { ar: 'وصف نوع المدير (إنجليزي)', en: 'Manager type (EN)' },
  managerPositionList: { ar: 'قائمة مناصب المدير', en: 'Manager positions' },
  liquidatorList: { ar: 'قائمة المصفّين', en: 'Liquidator list' },

  // Person info (shared by managers and individual partners)
  personInfo: { ar: 'بيانات الشخص', en: 'Person info' },
  identifierType: { ar: 'نوع المعرّف', en: 'Identifier type' },
  identifierTypeID: { ar: 'معرّف نوع الهوية', en: 'Identifier type ID' },
  identifierTypeDescAr: { ar: 'وصف نوع الهوية (عربي)', en: 'Identifier type (AR)' },
  identifierTypeDescEn: { ar: 'وصف نوع الهوية (إنجليزي)', en: 'Identifier type (EN)' },
  identifierNo: { ar: 'رقم المعرّف', en: 'Identifier number' },
  titleAr: { ar: 'اللقب (عربي)', en: 'Title (AR)' },
  titleEn: { ar: 'اللقب (إنجليزي)', en: 'Title (EN)' },
  firstNameAr: { ar: 'الاسم الأول (عربي)', en: 'First name (AR)' },
  firstNameEn: { ar: 'الاسم الأول (إنجليزي)', en: 'First name (EN)' },
  fatherNameAr: { ar: 'اسم الأب (عربي)', en: 'Father name (AR)' },
  fatherNameEn: { ar: 'اسم الأب (إنجليزي)', en: 'Father name (EN)' },
  grandFatherNameAr: { ar: 'اسم الجد (عربي)', en: 'Grandfather name (AR)' },
  grandFatherNameEn: { ar: 'اسم الجد (إنجليزي)', en: 'Grandfather name (EN)' },
  familyNameAr: { ar: 'اسم العائلة (عربي)', en: 'Family name (AR)' },
  familyNameEn: { ar: 'اسم العائلة (إنجليزي)', en: 'Family name (EN)' },
  nationality: { ar: 'الجنسية', en: 'Nationality' },
  nationalityID: { ar: 'معرّف الجنسية', en: 'Nationality ID' },
  nationalityDescriptionAr: { ar: 'وصف الجنسية (عربي)', en: 'Nationality (AR)' },
  nationalityDescriptionEn: { ar: 'وصف الجنسية (إنجليزي)', en: 'Nationality (EN)' },

  // ── parityList (partners) ──
  parityList: { ar: 'قائمة الشركاء', en: 'Partner list' },
  parityType: { ar: 'نوع الشريك', en: 'Partner type' },
  parityTypeID: { ar: 'معرّف نوع الشريك', en: 'Partner type ID' },
  parityTypeDescriptionAr: { ar: 'وصف نوع الشريك (عربي)', en: 'Partner type (AR)' },
  parityTypeDescriptionEn: { ar: 'وصف نوع الشريك (إنجليزي)', en: 'Partner type (EN)' },
  partnershipTypeList: { ar: 'أنواع الشراكة', en: 'Partnership type list' },
  partnershipTypeID: { ar: 'معرّف نوع الشراكة', en: 'Partnership type ID' },
  partnershipTypeDescriptionAr: { ar: 'وصف نوع الشراكة (عربي)', en: 'Partnership type (AR)' },
  partnershipTypeDescriptionEn: { ar: 'وصف نوع الشراكة (إنجليزي)', en: 'Partnership type (EN)' },

  // Entity-style partners (polymorphic — only one of these is populated per partner)
  governmentalEntity: { ar: 'جهة حكومية', en: 'Governmental entity' },
  endowment: { ar: 'وقف', en: 'Endowment' },
  civilAssociation: { ar: 'جمعية أهلية', en: 'Civil association' },
  saudiCompany: { ar: 'شركة سعودية', en: 'Saudi company' },
  establishment: { ar: 'مؤسسة', en: 'Establishment' },
  gccCompany: { ar: 'شركة خليجية', en: 'GCC company' },
  foreignCompany: { ar: 'شركة أجنبية', en: 'Foreign company' },
  pressInstitution: { ar: 'مؤسسة صحفية', en: 'Press institution' },
  specialPurposeEntity: { ar: 'كيان ذو غرض خاص', en: 'Special purpose entity' },
  cooperativeSociety: { ar: 'جمعية تعاونية', en: 'Cooperative society' },
  institute: { ar: 'معهد', en: 'Institute' },
  gccGovernmentalEntity: { ar: 'جهة حكومية خليجية', en: 'GCC governmental entity' },
  country: { ar: 'دولة', en: 'Country' },
  foreignGovernmentalEntity: { ar: 'جهة حكومية أجنبية', en: 'Foreign governmental entity' },
  organization: { ar: 'منظمة', en: 'Organization' },

  // Partner share
  partnerShare: { ar: 'حصة الشريك', en: 'Partner share' },
  cashContributionCount: { ar: 'عدد الحصص النقدية', en: 'Cash contribution count' },
  inkindContributionCount: { ar: 'عدد الحصص العينية', en: 'In-kind contribution count' },
  totalContributionCount: { ar: 'إجمالي الحصص', en: 'Total contribution count' },

  // ── mcV2/GetViolationsQuery (per-facility MoC violations) ──
  // GET ?crNationalNumber={encryptedCrNationalNumber}&pageNumber=1&pageSize=1000
  totalViolationCount: { ar: 'إجمالي عدد المخالفات', en: 'Total violation count' },
  violations: { ar: 'المخالفات', en: 'Violations' },

  // ── Qawaem/GetQawaemStatistics (per-facility financial statement filings) ──
  // GET ?nCrNumber={encryptedCrNationalNumber}
  // Represents "مخالفات عدم إيداع القوائم المالية" — when yearly count is 0,
  // the company hasn't filed statements for that year (a compliance violation).
  total: { ar: 'الإجمالي', en: 'Total' },
  qawaemList: { ar: 'قائمة القوائم المالية', en: 'Financial statements list' },
  year: { ar: 'السنة', en: 'Year' },
  count: { ar: 'العدد', en: 'Count' },

  // ── gosi/establishments-main-info-by-cr-national-number ──
  // GET /{encryptedCrNationalNumber} (path param, not query).
  // GOSI = General Organization for Social Insurance. Numbers come back as
  // STRINGS (e.g. "527.31") not numbers — coerce on the consumer side.
  establishmentList: { ar: 'قائمة المنشآت', en: 'Establishment list' },
  establishmentNameArb: { ar: 'اسم المنشأة (عربي)', en: 'Establishment name (AR)' },
  registrationNumber: { ar: 'رقم التسجيل في التأمينات', en: 'GOSI registration number' },
  numberOfContributors: { ar: 'عدد المشتركين', en: 'Contributors count' },
  numberOfSaudiContributors: { ar: 'عدد المشتركين السعوديين', en: 'Saudi contributors' },
  numberOfNonSaudiContributors: { ar: 'عدد المشتركين غير السعوديين', en: 'Non-Saudi contributors' },
  numberOfRegistrationNumbers: { ar: 'عدد أرقام التسجيل', en: 'Registration numbers count' },
  totalContribution: { ar: 'إجمالي الاشتراكات', en: 'Total contribution' },
  totalDebit: { ar: 'إجمالي المديونية', en: 'Total debit' },
  totalPenalties: { ar: 'إجمالي الغرامات', en: 'Total penalties' },

  // ── gosi/establishments-file-info-by-registration-number ──
  // GET /{registrationNumber} (path param). Drilldown into a single GOSI
  // establishment file using the registrationNumber returned by the main
  // info call. Some keys differ from the main-info endpoint:
  //   - establishmentNamArb (typo, missing "e") instead of establishmentNameArb
  //   - molEstID, molEstOfficeID, moluniID, molofficeID — MoL (HRSD) IDs
  //   - unifiedNationalNumber, crn — convenience back-refs to the CR
  establishmentNamArb: { ar: 'اسم المنشأة (عربي)', en: 'Establishment name (AR) [GOSI file]' },
  molEstID: { ar: 'رقم المنشأة في وزارة الموارد البشرية', en: 'MoL establishment ID' },
  molEstOfficeID: { ar: 'معرّف مكتب العمل', en: 'MoL labor-office ID' },
  molofficeID: { ar: 'معرّف مكتب العمل', en: 'MoL office ID' },
  moluniID: { ar: 'الرقم الموحد في وزارة الموارد البشرية', en: 'MoL unified ID' },
  unifiedNationalNumber: { ar: 'الرقم الموحد للمنشأة', en: 'Unified national number' },
  crn: { ar: 'رقم السجل التجاري', en: 'CR number' },

  // ── gosi/establishment-compliance (POST) ──
  // POST body: { month, year, officeID, unifiedID } — officeID/unifiedID come
  // from gosi-file response (molofficeID + moluniID). month/year are current.
  // Wage Protection System (WPS) + contract authentication compliance.
  month: { ar: 'الشهر', en: 'Month' },
  officeID: { ar: 'معرّف مكتب العمل', en: 'Office ID' },
  unifiedID: { ar: 'الرقم الموحد', en: 'Unified ID' },
  caCompliancePercentage: { ar: 'نسبة الالتزام بالعقود الموثقة', en: 'Contract authentication compliance %' },
  compliancePeriod: { ar: 'فترة الالتزام', en: 'Compliance period' },
  numberOfAUthenicated: { ar: 'عدد العقود الموثقة', en: 'Authenticated contracts count' },
  numberOfPaidLaborers: { ar: 'عدد العمال الذين صُرفت أجورهم', en: 'Paid laborers count' },
  numberOfUNAUthenicated: { ar: 'عدد العقود غير الموثقة', en: 'Unauthenticated contracts count' },
  numberOfUnPaidLaborers: { ar: 'عدد العمال الذين لم تُصرف أجورهم', en: 'Unpaid laborers count' },
  wpsCompliancePercentage: { ar: 'نسبة الالتزام بحماية الأجور', en: 'WPS compliance %' },
  wpsComplianceStatus: { ar: 'حالة الالتزام بحماية الأجور', en: 'WPS compliance status' },

  // ── hrsd/get-establishment-statistics ──
  // GET /{encryptedCrNationalNumber} (path param). HRSD = Ministry of Human
  // Resources & Social Development. Returns Nitaqat statistics, work-permit
  // counts, Saudization percentage, MoL office identifiers. Note: the API
  // returns "laboerOfficeName" with a typo (extra "e") — we keep the original
  // spelling so consumers can look it up exactly as it appears in the JSON.
  establishmentFileNumber: { ar: 'رقم ملف المنشأة', en: 'Establishment file number' },
  laborOfficeIdField: { ar: 'معرّف مكتب العمل', en: 'Labor office ID' },
  sequenceNumberField: { ar: 'الرقم التسلسلي', en: 'Sequence number' },
  commercialRecordNumber: { ar: 'رقم السجل التجاري', en: 'Commercial record number' },
  foreignLaborers: { ar: 'عدد العمالة غير السعودية', en: 'Foreign laborers' },
  laboerOfficeName: { ar: 'اسم مكتب العمل', en: 'Labor office name' },
  nitaq: { ar: 'النطاق', en: 'Nitaq band' },
  code: { ar: 'الرمز', en: 'Code' },
  nameLocal: { ar: 'الاسم المحلي', en: 'Local name' },
  nitaqatEconomicActivity: { ar: 'النشاط الاقتصادي في نطاقات', en: 'Nitaqat economic activity' },
  saudiLaborers: { ar: 'عدد العمالة السعودية', en: 'Saudi laborers' },
  totalAboutToExpireWorkPermits: { ar: 'إجمالي رخص العمل القاربة على الانتهاء', en: 'About-to-expire work permits' },
  totalExpiredWorkPermits: { ar: 'إجمالي رخص العمل المنتهية', en: 'Expired work permits' },
  totalIssuedWorkPermits: { ar: 'إجمالي رخص العمل الصادرة', en: 'Issued work permits' },
  totalLaborers: { ar: 'إجمالي العمالة', en: 'Total laborers' },
  unifiedNumber: { ar: 'الرقم الموحد (مكتب العمل + تسلسلي)', en: 'Unified number (labor-office + sequence)' },
  entity_Saudi_Percentage: { ar: 'نسبة السعودة في المنشأة', en: 'Saudization percentage' },

  // ── momrah/commercial-licenses-by-cr-number ──
  // GET ?crNumber={encryptedCrNationalNumber}. List of municipal commercial
  // licenses from the Ministry of Municipal & Rural Affairs (MoMRAH). Response
  // wraps list inside data.result.list — typical envelope-style API.
  data: { ar: 'البيانات', en: 'Data' },
  responseCode: { ar: 'رمز الاستجابة', en: 'Response code' },
  responseMessage: { ar: 'رسالة الاستجابة', en: 'Response message' },
  result: { ar: 'النتيجة', en: 'Result' },
  list: { ar: 'القائمة', en: 'List' },
  additionalActivities: { ar: 'الأنشطة الإضافية', en: 'Additional activities' },
  amanaName: { ar: 'اسم الأمانة', en: 'Amana (regional municipality) name' },
  baladiaName: { ar: 'اسم البلدية', en: 'Baladia (municipality) name' },
  comRegestrationNo: { ar: 'رقم السجل التجاري', en: 'CR number (Momrah spelling)' },
  districtName: { ar: 'اسم الحي', en: 'District name' },
  expirationLeftPeriod: { ar: 'المدة المتبقية للانتهاء (بالأيام)', en: 'Days remaining' },
  identityNo: { ar: 'رقم الهوية', en: 'Identity number' },
  identityType: { ar: 'نوع الهوية', en: 'Identity type' },
  licenseEndDateH: { ar: 'تاريخ انتهاء الرخصة (هجري)', en: 'License end date (Hijri)' },
  licenseEndDateM: { ar: 'تاريخ انتهاء الرخصة (ميلادي)', en: 'License end date (Gregorian)' },
  licenseId: { ar: 'رقم الرخصة', en: 'License ID' },
  encryptedLicenseId: { ar: 'رقم الرخصة المشفّر', en: 'Encrypted license ID' },
  licenseStatus: { ar: 'حالة الرخصة', en: 'License status' },
  mainDetailActivity: { ar: 'النشاط الرئيسي التفصيلي', en: 'Main detailed activity' },
  mainIsicActivity: { ar: 'النشاط الرئيسي حسب التصنيف الدولي (ISIC)', en: 'Main ISIC activity' },
  permitList: { ar: 'قائمة التصاريح', en: 'Permit list' },
  permitEndDate: { ar: 'تاريخ انتهاء التصريح', en: 'Permit end date' },
  permitExpleftPeriod: { ar: 'المدة المتبقية لانتهاء التصريح', en: 'Permit days remaining' },
  permitName: { ar: 'اسم التصريح', en: 'Permit name' },
  printPermitUrl: { ar: 'رابط طباعة التصريح', en: 'Permit print URL' },
  printLicenseUrl: { ar: 'رابط طباعة الرخصة', en: 'License print URL' },
  shopName: { ar: 'اسم المحل (الاسم التجاري)', en: 'Shop / trade name' },
  statusDetails: { ar: 'تفاصيل الحالة', en: 'Status details' },
  message: { ar: 'الرسالة', en: 'Message' },

  // ── mcV2/GetEmtethalViolationsQuery (Emtethal / compliance violations) ──
  // GET /{encryptedCrNationalNumber}?pageNumber=1&pageSize=1000 — encrypted CR
  // is a path param, not query. Returns 422 with the error envelope below
  // when the facility has no Emtethal violations record. Success shape is
  // assumed to mirror GetViolationsQuery (totalViolationCount + violations[]).
  error: { ar: 'الخطأ', en: 'Error' },
  providerId: { ar: 'معرّف المزوّد', en: 'Provider ID' },
  details: { ar: 'التفاصيل', en: 'Details' },
  validationErrors: { ar: 'أخطاء التحقق', en: 'Validation errors' },

  // ── mcV2/get-print-cr-by-national-number ──
  // GET ?crNationalNumber={encryptedCrNationalNumber}&crNumber=&culture=ar
  // Returns a signed downloadUrl pointing to printcr.mc.gov.sa where the
  // actual PDF lives. The bookmarklet fetches the PDF and uploads it to
  // Supabase Storage at documents/sbc-cr-certificates/{cr_national_number}.pdf
  // The token inside downloadUrl is single-use-ish; we don't store the URL
  // long-term, only the storage path.
  content: { ar: 'المحتوى', en: 'Content' },
  downloadUrl: { ar: 'رابط التحميل', en: 'Download URL' },
  extension: { ar: 'امتداد الملف', en: 'File extension' },
  culture: { ar: 'اللغة', en: 'Culture / language' },
}

// Lookup helper. Falls back to the raw key when missing so unmapped fields
// surface in the UI (better than silently rendering empty strings).
export function sbcLabel(key, lang = 'ar') {
  const f = SBC_FIELDS[key]
  if (!f) return key
  return f[lang] || f.ar || key
}
