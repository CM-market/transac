type ProjectEnvVariablesType = Pick<
  ImportMetaEnv,
  "VITE_TRANSAC_WEBAUTH_RP_ID" | "VITE_TRANSAC_WEBAUTH_RP_NAME"
>;

const projectEnvVariables: ProjectEnvVariablesType = {
  VITE_TRANSAC_WEBAUTH_RP_ID: "${VITE_TRANSAC_WEBAUTH_RP_ID}",
  VITE_TRANSAC_WEBAUTH_RP_NAME: "${VITE_TRANSAC_WEBAUTH_RP_NAME}",
};

interface ProjectEnvVariables {
  envVariables: ProjectEnvVariablesType;
}

export const getProjectEnvVariables = (): ProjectEnvVariables => {
  return {
    envVariables: {
      VITE_TRANSAC_WEBAUTH_RP_ID:
        !projectEnvVariables.VITE_TRANSAC_WEBAUTH_RP_ID.includes(
          "VITE_TRANSAC_",
        )
          ? projectEnvVariables.VITE_TRANSAC_WEBAUTH_RP_ID
          : import.meta.env.VITE_TRANSAC_WEBAUTH_RP_ID,

      VITE_TRANSAC_WEBAUTH_RP_NAME:
        !projectEnvVariables.VITE_TRANSAC_WEBAUTH_RP_NAME.includes(
          "VITE_TRANSAC_",
        )
          ? projectEnvVariables.VITE_TRANSAC_WEBAUTH_RP_NAME
          : import.meta.env.VITE_TRANSAC_WEBAUTH_RP_NAME,
    },
  };
};
