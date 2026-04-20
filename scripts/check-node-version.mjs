const [major] = process.versions.node.split('.').map(Number);

if (major !== 22) {
  console.error(
    `Unsupported Node.js runtime: v${process.versions.node}. Use Node 22 LTS for the admin panel.`,
  );
  console.error('Example: `nvm install 22 && nvm use 22`');
  process.exit(1);
}
