use crate::entity::revocation::{ActiveModel as RevocationActiveModel, Entity as Revocation};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set};

pub struct RevocationRepo;

impl RevocationRepo {
    pub async fn is_revoked(
        db: &DatabaseConnection,
        device_id: &str,
    ) -> Result<bool, sea_orm::DbErr> {
        let record = Revocation::find_by_id(device_id).one(db).await?;
        Ok(record.map(|r| r.is_revocked).unwrap_or(false))
    }

    pub async fn _revoke(db: &DatabaseConnection, device_id: &str) -> Result<(), sea_orm::DbErr> {
        let record = Revocation::find_by_id(device_id).one(db).await?;
        if let Some(rec) = record {
            let mut active: RevocationActiveModel = rec.into();
            active.is_revocked = Set(true);
            active.update(db).await?;
        } else {
            let new = RevocationActiveModel {
                device_id: Set(device_id.to_string()),
                is_revocked: Set(true),
            };
            new.insert(db).await?;
        }
        Ok(())
    }

    pub async fn clear_revocation(
        db: &DatabaseConnection,
        device_id: &str,
    ) -> Result<(), sea_orm::DbErr> {
        let record = Revocation::find_by_id(device_id).one(db).await?;
        if let Some(rec) = record {
            let mut active: RevocationActiveModel = rec.into();
            active.is_revocked = Set(false);
            active.update(db).await?;
        }
        Ok(())
    }
}
