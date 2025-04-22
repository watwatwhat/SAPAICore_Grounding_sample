namespace gptservice;

using {
  cuid,
  managed
} from '@sap/cds/common';

entity Qahistory : cuid, managed {
  metadata  : LargeString;
  question  : LargeString;
  answer    : LargeString;
  mergedqa  : LargeString;
  custom_embedding: Vector(1536);
}