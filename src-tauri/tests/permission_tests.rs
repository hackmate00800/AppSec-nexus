use appsec_nexus_lib::models::UserRole;

#[test]
fn test_user_role_defaults_and_equality() {
    let default_role = UserRole::default();
    assert_eq!(default_role, UserRole::Viewer);
    assert_ne!(UserRole::Admin, UserRole::Viewer);
}

#[test]
fn test_role_serialization() {
    let admin = UserRole::Admin;
    let json = serde_json::to_string(&admin).expect("Serialization failed");
    assert_eq!(json, "\"Admin\"");

    let deserialized: UserRole = serde_json::from_str(&json).expect("Deserialization failed");
    assert_eq!(deserialized, UserRole::Admin);
}
