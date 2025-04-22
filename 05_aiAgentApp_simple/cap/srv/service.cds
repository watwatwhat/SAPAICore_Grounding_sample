using {gptservice as my} from '../db/schema';

service GPTService {
  entity Qahistory as
    projection on my.Qahistory
    excluding {
      // sap_embedding,
      custom_embedding
    };
}
