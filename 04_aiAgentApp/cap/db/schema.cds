namespace gptservice;

using {
  cuid,
  managed
} from '@sap/cds/common';

entity Dummy {
  key id : Integer;
}

@cds.persistence.exists 
@cds.persistence.table: 'QAHISTORY'
entity Qahistory : cuid, managed {
  metadata  : LargeString;
  question  : LargeString;
  answer    : LargeString;
  mergedqa  : LargeString;
  // SAP_EMBEDDING フィールドは GENERATED ALWAYS AS で定義された仮想カラム（計算カラム）のため、明示的な INSERT や UPDATE が禁止されている。
  // そのため、CAPで定義してしまうとINSERTをここに対してしようとしてしまうため、除外が必要
  // sap_embedding : Vector(768);
  custom_embedding: Vector(1536);
}