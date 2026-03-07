const { withGradleProperties, createRunOncePlugin } = require('expo/config-plugins');

const PROPERTY_KEY = 'androidx.compose.compiler.plugins.kotlin.suppressKotlinVersionCompatibilityCheck';
const PROPERTY_VALUE = 'true';

function withComposeKotlinCompatibility(config) {
  return withGradleProperties(config, (config) => {
    const properties = config.modResults || [];
    const existingProperty = properties.find(
      (property) => property.type === 'property' && property.key === PROPERTY_KEY
    );

    if (existingProperty) {
      existingProperty.value = PROPERTY_VALUE;
    } else {
      properties.push({
        type: 'property',
        key: PROPERTY_KEY,
        value: PROPERTY_VALUE,
      });
    }

    config.modResults = properties;
    return config;
  });
}

module.exports = createRunOncePlugin(
  withComposeKotlinCompatibility,
  'with-compose-kotlin-compatibility',
  '1.0.0'
);
