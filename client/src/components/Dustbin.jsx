import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import axios from "axios";

const Dustbin = () => {
  const mountRef = useRef(null);
  const dustbinRef = useRef(null);
  const sceneRef = useRef(null); // Ref for the scene
  const garbageList = useRef([]); // Keep track of all garbage objects
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene; // Store scene in ref
    scene.background = null;

    // Adjust the camera to ensure the full dustbin is visible
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 21); // Farther back and slightly higher

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load Dustbin Model
    const loader = new GLTFLoader();
    loader.load(
      "/dustbin/scene.gltf", // Path to the dustbin model
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(10, 10, 10); // Scale the dustbin to make it larger
        model.position.set(0, -1, 3); // Lower the dustbin to make the entire model visible
        model.rotation.x = Math.PI / 12; // Small tilt for better garbage visibility
        scene.add(model);
        dustbinRef.current = model;
        setIsLoading(false);
      },
      undefined,
      (error) => {
        console.error("Error loading dustbin model:", error);
      }
    );

    const animateGarbage = () => {
      garbageList.current.forEach((garbage, index) => {
        // Simulate gravity by moving garbage downward slower
        garbage.position.y -= 0.145; // Slow falling for smooth animation

        // Check if garbage has fallen into the dustbin
        if (garbage.position.y < -4.5) {
          scene.remove(garbage); // Remove garbage from the scene
          garbageList.current.splice(index, 1); // Remove from the list
        }
      });
    };

    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);

      // Animate the garbage items
      animateGarbage();

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect =
        mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  const handleClick = async () => {
    if (isLoading) return;

    const scene = sceneRef.current; // Access the scene
    if (!scene || !dustbinRef.current) return;

    // Add a new garbage item to the scene
    const loader = new GLTFLoader();
    loader.load(
      "/garbage_bag/scene.gltf", // Path to the garbage model
      (gltf) => {
        const garbage = gltf.scene;

        // Adjust garbage size and initial position
        garbage.scale.set(5, 5, 5); // Make garbage much larger
        garbage.position.set(
          Math.random() * 2 - 1, // Random X near the center
          15, // High enough for falling effect
          Math.random() * 2 - 1 // Random Z near the center
        );

        // Add shadows to garbage
        garbage.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Add garbage to the scene
        scene.add(garbage);
        garbageList.current.push(garbage); // Track garbage items in the list
      },
      undefined,
      (error) => {
        console.error("Error loading garbage model:", error);
      }
    );

    // Call the server to add points
    try {
      await axios.get("http://localhost:4000/add-points");
      console.log("Points updated successfully");
    } catch (error) {
      console.error("Error calling server:", error);
    }
  };

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "700px", // Increased height for better visibility
        cursor: isLoading ? "default" : "pointer",
      }}
      onClick={handleClick}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          Loading model...
        </div>
      )}
    </div>
  );
};

export default Dustbin;