service BODetailsService  {
@cds.persistence.skip 
entity MaintenanceOrderLongText {key TextObjectType : String;
key Language : String;
MaintenanceOrderLongText : LargeString;
key MaintenanceOrder : String(12);};

@cds.persistence.skip 
entity MaintOrderOpLongText {key TextObjectType : String;
key Language : String;
OrderOperationLongText : LargeString;
key MaintenanceOrder : String(12);
key MaintenanceOrderOperation : String;
key MaintenanceOrderSubOperation : String;};

@cds.persistence.skip 
entity MaintenanceOrderOperation {key MaintenanceOrderOperation : String;
key MaintenanceOrderSubOperation : String;
OperationDescription : String;
key MaintenanceOrder : String(12);
TextObjectType : String;
Language : String;
OrderOperationLongText : LargeString;
to_MaintOrderOpLongText : Composition of many MaintOrderOpLongText on to_MaintOrderOpLongText.MaintenanceOrder = MaintenanceOrder and to_MaintOrderOpLongText.MaintenanceOrderOperation = MaintenanceOrderOperation and to_MaintOrderOpLongText.MaintenanceOrderSubOperation = MaintenanceOrderSubOperation;};

@cds.persistence.skip 
entity MaintenanceOrder {key MaintenanceOrder : String(12);
MaintOrdBasicStartDate : Date;
MaintOrdBasicEndDate : Date;
MaintenanceOrderDesc : String(50);
CompanyCode : String(10);
Equipment : String;
EquipmentName : String;
MaintenanceOrderType : String(4);
TextObjectType : String;
Language : String;
MaintenanceOrderLongText : LargeString;
MaintenanceOrderOperation : String;
MaintenanceOrderSubOperation : String;
OperationDescription : String;
to_MaintenanceOrderLongText : Composition of many MaintenanceOrderLongText on to_MaintenanceOrderLongText.MaintenanceOrder = MaintenanceOrder;
to_MaintenanceOrderOperation : Composition of many MaintenanceOrderOperation on to_MaintenanceOrderOperation.MaintenanceOrder = MaintenanceOrder;};

@Capabilities.Deletable: false
@Capabilities.SearchRestrictions.Searchable: false
@cds.persistence.skip 
entity Equipment {key Equipment : String;
EquipmentName : String;
ManufacturerPartNmbr : String;
ManufacturerSerialNumber : String;
WorkCenterPlant : String;
AssetLocation : String;
EquipmentCategory : String;
summarization : String;
orders : Association to many MaintenanceOrder on orders.Equipment = Equipment;}actions{
  @(
          cds.odata.bindingparameter.name: '_it',
          Common.SideEffects             : {TargetProperties: ['_it/summarization']}
  )
  action summarize(config: String);
};

@cds.persistence.skip 
entity A_PurchaseOrderNote {key TextObjectType : String;
key Language : String;
PlainLongText : LargeString;
key PurchaseOrder : String;};

@Capabilities.Deletable: false
@Capabilities.SearchRestrictions.Searchable: false
@cds.persistence.skip 
entity A_PurchaseOrder {key PurchaseOrder : String;
PurchaseOrderType : String;
Supplier : String;
PurchaseOrderDate : String;
CompanyCode : String;
summarization : String;
to_PurchaseOrderNote : Composition of many A_PurchaseOrderNote on to_PurchaseOrderNote.PurchaseOrder = PurchaseOrder;}actions{
  @(
          cds.odata.bindingparameter.name: '_it',
          Common.SideEffects             : {TargetProperties: ['_it/summarization']}
  )
  action summarize(config: String);
};
}
annotate BODetailsService.Equipment with @( 
UI.SelectionFields: [ 
Equipment,
EquipmentName,
EquipmentCategory,
ManufacturerPartNmbr 
],
UI.LineItem: [
 {
$Type : 'UI.DataField',
Label  :  'Equipment',
Value : Equipment
},
 {
$Type : 'UI.DataField',
Label  :  'Equipment Name',
Value : EquipmentName
},
 {
$Type : 'UI.DataField',
Label  :  'Manufacturer Part Number',
Value : ManufacturerPartNmbr
},
 {
$Type : 'UI.DataField',
Label  :  'Manufacturer Serial Number',
Value : ManufacturerSerialNumber
},
 {
$Type : 'UI.DataField',
Label  :  'Work Center Plant',
Value : WorkCenterPlant
},
 {
$Type : 'UI.DataField',
Label  :  'Asset Location',
Value : AssetLocation
},
 {
$Type : 'UI.DataField',
Label  :  'Equipment Category',
Value : EquipmentCategory
},
]
);
annotate BODetailsService.A_PurchaseOrder with @( 
UI.SelectionFields: [ 
PurchaseOrder,
PurchaseOrderType,
Supplier,
CompanyCode 
],
UI.LineItem: [
 {
$Type : 'UI.DataField',
Label  :  'Purchase Order',
Value : PurchaseOrder
},
 {
$Type : 'UI.DataField',
Label  :  'Purchase Order Type',
Value : PurchaseOrderType
},
 {
$Type : 'UI.DataField',
Label  :  'Supplier',
Value : Supplier
},
 {
$Type : 'UI.DataField',
Label  :  'Purchase Order Date',
Value : PurchaseOrderDate
},
 {
$Type : 'UI.DataField',
Label  :  'Company Code',
Value : CompanyCode
},
]
);
annotate BODetailsService.Equipment with @( 
UI.FieldGroup#GGEquipment :  {
$Type : 'UI.FieldGroupType',
Data: [
 {
$Type : 'UI.DataField',
Label  :  'Equipment',
Value : Equipment
},
 {
$Type : 'UI.DataField',
Label  :  'Equipment Name',
Value : EquipmentName
},
 {
$Type : 'UI.DataField',
Label  :  'Manufacturer Part Number',
Value : ManufacturerPartNmbr
},
 {
$Type : 'UI.DataField',
Label  :  'Manufacturer Serial Number',
Value : ManufacturerSerialNumber
},
 {
$Type : 'UI.DataField',
Label  :  'Work Center Plant',
Value : WorkCenterPlant
},
 {
$Type : 'UI.DataField',
Label  :  'Asset Location',
Value : AssetLocation
},
 {
$Type : 'UI.DataField',
Label  :  'Equipment Category',
Value : EquipmentCategory
},
]},
UI.Facets: [
 {
$Type : 'UI.ReferenceFacet',
Label  :  'General Information',
ID : 'GFGeneral',
Target : @UI.FieldGroup#GGEquipment
},
 {
$Type : 'UI.ReferenceFacet',
Label  :  'Maintenance Order Details',
ID : 'MaintenanceOrder',
Target : 'orders/@UI.LineItem#MaintenanceOrder'
}
],
UI.HeaderInfo:  {
Title : {
$Type : 'UI.DataField',
Value : 'Equipment Details',
},
TypeName :'Equipment Details',
TypeNamePlural: 'Equipment Details'
}
);
annotate BODetailsService.A_PurchaseOrder with @( 
UI.FieldGroup#GGA_PurchaseOrder :  {
$Type : 'UI.FieldGroupType',
Data: [
 {
$Type : 'UI.DataField',
Label  :  'Purchase Order',
Value : PurchaseOrder
},
 {
$Type : 'UI.DataField',
Label  :  'Purchase Order Type',
Value : PurchaseOrderType
},
 {
$Type : 'UI.DataField',
Label  :  'Supplier',
Value : Supplier
},
 {
$Type : 'UI.DataField',
Label  :  'Purchase Order Date',
Value : PurchaseOrderDate
},
 {
$Type : 'UI.DataField',
Label  :  'Company Code',
Value : CompanyCode
},
]},
UI.Facets: [
 {
$Type : 'UI.ReferenceFacet',
Label  :  'General Information',
ID : 'GFGeneral',
Target : @UI.FieldGroup#GGA_PurchaseOrder
},
 {
$Type : 'UI.ReferenceFacet',
Label  :  'Purchase Order Details',
ID : 'A_PurchaseOrder',
Target : 'to_PurchaseOrderNote/@UI.LineItem#A_PurchaseOrderNote'
}
],
UI.HeaderInfo:  {
Title : {
$Type : 'UI.DataField',
Value : 'Purchase Order Details',
},
TypeName :'Purchase Order Details',
TypeNamePlural: 'Purchase Order Details'
}
);annotate BODetailsService.Equipment with @( 
UI.FieldGroup#HistoricalSummary :  {
$Type : 'UI.FieldGroupType',
Data: [ {
$Type : 'UI.DataField',
Label  :  'Historical Summary',
Value : summarization,
![@HTML5.CssDefaults]: {width: '100rem'}
},
]}
);
annotate BODetailsService.A_PurchaseOrder with @( 
UI.FieldGroup#HistoricalSummary :  {
$Type : 'UI.FieldGroupType',
Data: [ {
$Type : 'UI.DataField',
Label  :  'Historical Summary',
Value : summarization,
![@HTML5.CssDefaults]: {width: '100rem'}
},
]}
);annotate BODetailsService.MaintenanceOrder with @( 
UI.LineItem#MaintenanceOrder : 
[
 {
$Type : 'UI.DataField',
Label  :  'Maintenance Order',
Value : MaintenanceOrder
},
 {
$Type : 'UI.DataField',
Label  :  'Start Date',
Value : MaintOrdBasicStartDate
},
 {
$Type : 'UI.DataField',
Label  :  'End Date',
Value : MaintOrdBasicEndDate
},
 {
$Type : 'UI.DataField',
Label  :  'Maintenance Order Description',
Value : MaintenanceOrderDesc
},
 {
$Type : 'UI.DataField',
Label  :  'Company Code',
Value : CompanyCode
},
 {
$Type : 'UI.DataField',
Label  :  'Order Type',
Value : MaintenanceOrderType
}, {
$Type : 'UI.DataField',
Label  :  'Maintenance Order Long Text',
Value : MaintenanceOrderLongText
},
 {
$Type : 'UI.DataField',
Label  :  'Operation Description',
Value : OperationDescription
}
]
);
annotate BODetailsService.A_PurchaseOrderNote with @( 
UI.LineItem#A_PurchaseOrderNote : 
[
 {
$Type : 'UI.DataField',
Label  :  'Purchase Order Long Text',
Value : PlainLongText
},
 {
$Type : 'UI.DataField',
Label  :  'Purchase Order',
Value : PurchaseOrder
},
]
);