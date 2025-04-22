using {gptservice as my} from '../db/schema';

service GPTService {
  entity QahistoryView as
    projection on my.Qahistory
    excluding {
      custom_embedding
    };
}
