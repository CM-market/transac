use crate::entity::profile::{
    self, ActiveModel as ProfileActiveModel, Entity as ProfileEntity, Model as ProfileModel,
};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use tracing::{debug, error};
use uuid::Uuid;

/// Maximum length for a profile name.
pub const MAX_NAME_LEN: usize = 255;

#[allow(dead_code)]
pub struct Profile;

#[allow(dead_code)]
impl Profile {
    /// Fetch the profile for a given device id, if one exists.
    pub async fn get_by_device(
        db: &DatabaseConnection,
        device_id: &str,
    ) -> Result<Option<ProfileModel>, String> {
        ProfileEntity::find()
            .filter(profile::Column::DeviceId.eq(device_id.to_owned()))
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch profile for device {}: {:?}", device_id, e);
                "Failed to fetch profile. Please try again later.".to_string()
            })
    }

    /// Create or update the profile for a device.
    ///
    /// Validates the name (non-empty) and the Cameroon phone format before
    /// persisting. Returns a `String` error message on invalid input.
    pub async fn upsert(
        db: &DatabaseConnection,
        device_id: &str,
        name: &str,
        phone: Option<&str>,
        location: Option<&str>,
    ) -> Result<ProfileModel, String> {
        Self::validate(name, phone)?;

        // Attempt to load an existing profile for this device.
        if let Some(existing) = Self::get_by_device(db, device_id).await? {
            let mut active: ProfileActiveModel = existing.into();
            active.name = Set(name.to_owned());
            active.phone = Set(phone.map(|p| p.to_owned()));
            active.location = Set(location.map(|l| l.to_owned()));
            active.updated_at = Set(Utc::now());
            let updated = active.update(db).await.map_err(|e| {
                error!("Failed to update profile for device {}: {:?}", device_id, e);
                "Failed to update profile. Please try again later.".to_string()
            })?;
            debug!("Updated profile for device {}", device_id);
            Ok(updated)
        } else {
            let profile = ProfileActiveModel {
                id: Set(Uuid::new_v4()),
                device_id: Set(device_id.to_owned()),
                name: Set(name.to_owned()),
                phone: Set(phone.map(|p| p.to_owned())),
                location: Set(location.map(|l| l.to_owned())),
                created_at: Set(Utc::now()),
                updated_at: Set(Utc::now()),
            };
            let created = profile.insert(db).await.map_err(|e| {
                error!("Failed to create profile for device {}: {:?}", device_id, e);
                "Failed to create profile. Please try again later.".to_string()
            })?;
            debug!("Created profile for device {}", device_id);
            Ok(created)
        }
    }

    /// Validate profile input. Returns a human-readable `String` error or `Ok(())`.
    fn validate(name: &str, phone: Option<&str>) -> Result<(), String> {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err("Name is required.".to_string());
        }
        if trimmed.chars().count() > MAX_NAME_LEN {
            return Err(format!("Name must be at most {MAX_NAME_LEN} characters."));
        }
        if let Some(p) = phone {
            if !p.trim().is_empty() && !is_valid_cameroon_phone(p) {
                return Err(
                    "Phone number must be a valid Cameroon number (e.g. +237 6XXXXXXXX)."
                        .to_string(),
                );
            }
        }
        Ok(())
    }
}

/// Returns `true` if `phone` is a valid Cameroon number.
///
/// Rule: after stripping all non-digit characters, the resulting digit string
/// must be exactly a `237` country code followed by 9 digits, i.e. a 12-digit
/// string starting with `237`. Accepts optional leading `+`, spaces and dashes.
pub fn is_valid_cameroon_phone(phone: &str) -> bool {
    let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
    digits.len() == 12 && digits.starts_with("237")
}

#[cfg(test)]
mod tests {
    use super::is_valid_cameroon_phone;

    #[test]
    fn cameroon_phone_with_country_code_valid() {
        assert!(is_valid_cameroon_phone("+237612345678"));
        assert!(is_valid_cameroon_phone("237612345678"));
        assert!(is_valid_cameroon_phone("+237 612 345 678"));
        assert!(is_valid_cameroon_phone("+237-612-345-678"));
    }

    #[test]
    fn local_mobile_number_without_country_code_invalid() {
        // The strict rule requires the 237 country code, so a bare 9-digit
        // number is rejected here (documented behavior).
        assert!(!is_valid_cameroon_phone("612345678"));
    }

    #[test]
    fn wrong_length_invalid() {
        assert!(!is_valid_cameroon_phone("+23761234567")); // too short (11 digits)
        assert!(!is_valid_cameroon_phone("+2376123456789")); // too long (13 digits)
        assert!(!is_valid_cameroon_phone(""));
    }

    #[test]
    fn wrong_country_code_invalid() {
        assert!(!is_valid_cameroon_phone("+33612345678")); // France (+33)
        assert!(!is_valid_cameroon_phone("+234612345678")); // Nigeria (+234)
    }

    #[test]
    fn non_numeric_characters_ignored() {
        assert!(is_valid_cameroon_phone("+237 (612) 345-678"));
    }
}
