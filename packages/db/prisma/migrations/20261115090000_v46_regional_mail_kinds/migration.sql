-- BR-464: retain the historical kind; new lifecycle mail is distinguishable.
ALTER TYPE "mail_kind" ADD VALUE 'regional_director_appoint';
ALTER TYPE "mail_kind" ADD VALUE 'regional_director_revoke';
