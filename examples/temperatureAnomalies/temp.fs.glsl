#ifdef GL_ES
precision highp float;
#endif

varying vec2 vTexCoord1;
varying vec2 vTexCoord2;
varying vec2 vTexCoord3;
varying vec4 vColor;
varying vec4 vTransformedNormal;
varying vec4 vPosition;

uniform float alphaUfm;

uniform float shininess;
uniform bool enableSpecularHighlights;
uniform bool enableLights;

uniform vec3 ambientColor;
uniform vec3 directionalColor;
uniform vec3 lightingDirection;

uniform bool enablePoint1;
uniform vec3 pointLocation1;
uniform vec3 pointColor1;
uniform vec3 pointSpecularColor1;

uniform bool enablePoint2;
uniform vec3 pointLocation2;
uniform vec3 pointColor2;
uniform vec3 pointSpecularColor2;

uniform bool enablePoint3;
uniform vec3 pointLocation3;
uniform vec3 pointColor3;
uniform vec3 pointSpecularColor3;

uniform bool hasTexture1;
uniform sampler2D sampler1;

uniform bool hasTexture2;
uniform sampler2D sampler2;

uniform bool hasTexture3;
uniform sampler2D sampler3;

uniform mat4 viewMatrix;

void main(void) {
  vec3 lightWeighting;
  if (!enableLights) {
    lightWeighting = vec3(1.0, 1.0, 1.0);
  } else {
    vec3 lightDirection;
    float specularLightWeighting = 0.0;
    float diffuseLightWeighting = 0.0;
    vec3  specularLight = vec3(0.0, 0.0, 0.0);
    vec3  diffuseLight = vec3(0.0, 0.0, 0.0);
    
    vec3 transformedPointLocation;
    vec3 normal = vTransformedNormal.xyz;
    
    vec3 eyeDirection = normalize(-vPosition.xyz);
    vec3 reflectionDirection;
    
    if (enablePoint1) {
      transformedPointLocation = (viewMatrix * vec4(pointLocation1, 1.0)).xyz;
      lightDirection = normalize(transformedPointLocation - vPosition.xyz);
      
      if (enableSpecularHighlights) {
        reflectionDirection = reflect(-lightDirection, normal);
        
        specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), shininess);
        specularLight += specularLightWeighting * pointSpecularColor1;
      }

      diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);
      diffuseLight += diffuseLightWeighting * pointColor1;
    }
    
    if (enablePoint2) {
      transformedPointLocation = (viewMatrix * vec4(pointLocation2, 1.0)).xyz;
      lightDirection = normalize(transformedPointLocation - vPosition.xyz);
      
      if (enableSpecularHighlights) {
        reflectionDirection = reflect(-lightDirection, normal);
        
        specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), shininess);
        specularLight += specularLightWeighting * pointSpecularColor2;
      }

      diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);
      diffuseLight += diffuseLightWeighting * pointColor2;
    }
 
    if (enablePoint3) {
      transformedPointLocation = (viewMatrix * vec4(pointLocation3, 1.0)).xyz;
      lightDirection = normalize(transformedPointLocation - vPosition.xyz);
      
      if (enableSpecularHighlights) {
        reflectionDirection = reflect(-lightDirection, normal);
        
        specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), shininess);
        specularLight += specularLightWeighting * pointSpecularColor3;
      }

      diffuseLightWeighting = max(dot(normal, lightDirection), 0.0);
      diffuseLight += diffuseLightWeighting * pointColor3;
    }
    
    lightWeighting = ambientColor + diffuseLight + specularLight;
  }

  vec4 fragmentColor = vec4(0.0, 0.0, 0.0, 0.0);
  if (hasTexture1 || hasTexture2 || hasTexture3) {
    if (hasTexture1) {
      fragmentColor += texture2D(sampler1, vec2(vTexCoord1.s, vTexCoord1.t));
    }
    if (hasTexture2) {
      fragmentColor += texture2D(sampler2, vec2(vTexCoord2.s, vTexCoord2.t));
    }
    if (hasTexture3) {
      fragmentColor += texture2D(sampler3, vec2(vTexCoord3.s, vTexCoord3.t));
    }
  } else {
    fragmentColor = vColor;
  }
  gl_FragColor = vec4(fragmentColor.rgb * lightWeighting, alphaUfm);
}
