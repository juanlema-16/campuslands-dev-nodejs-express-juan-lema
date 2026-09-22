function deprecate({ sunset, successor }) {
  return (req, res, next) => {
    res.set({ Deprecation: "true", Sunset: sunset, Link: `<${successor}>; rel="successor-version"` });
    next();
  };
}

export { deprecate };
